from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import os
import re
import parselmouth
from parselmouth.praat import call
import subprocess
import speech_recognition as sr
import json
import math
import nltk
import librosa
from praatio import tgio
from praatio import pitch_and_intensity
nltk.download('punkt')
nltk.download('cmudict')
from nltk.corpus import cmudict


#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#-----------------------------------------------Phrasecontour---------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:4200"}})

#---------------------------------------------------------------------------------------------------------------------------
def PitchCorection(x):
    with open(x, 'r') as fichier:
        lignes = fichier.readlines()

    for i in range(len(lignes)):
        if "frames" in lignes[i]:
            lignes[i] = lignes[i].replace("frames", "frame")
        if "candidates" in lignes[i]:
            lignes[i] = lignes[i].replace("candidates", "candidate")
    with open(x, 'w') as fichier:
        fichier.writelines(lignes)
#---------------------------------------------------------------------------------------------------------------------------
def runinterpolation(x,entry,exiit,erreur,fb,alpha):
    filename = x
    entrypoint = entry
    m_nExit = exiit
    m_dError = erreur
    m_strFb = fb
    m_dAlpha = alpha
    command = [
        "interpolation.exe",
        filename,
        entrypoint,
        m_nExit,
        m_dError,
        m_strFb,
        m_dAlpha
    ]
    subprocess.run(command)
def extract_value(text):
    parts = text.split('#')
    last_part = parts[-1]
    return last_part
#---------------------------------------------------------------------------------------------------------------------------
def getTextfromSound(x):
    liste_words = []
    nom_sans_extension = x.split(".")[0]
    textgridpath = nom_sans_extension+".TextGrid"
    if os.path.exists(textgridpath):
        print("Le fichier existe.")
        

        with open(textgridpath, 'r') as file:
            for line in file:
                if line.strip().startswith('text ='):
                    value = line.split('"')[1]
                    modified_value = extract_value(value)
                    liste_words.append(modified_value)

        print(liste_words)
        return liste_words
    else:
        print("Le fichier existe. NNOOOON")
        r=sr.Recognizer()
        audio_file = x
        harvad=sr.AudioFile(x)
        with harvad as source:
            audio=r.record(source)
        #print(r.recognize_google(audio, language='de-DE'))#####################
        text =r.recognize_google(audio, language='de-DE')
        vowels = ['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü']
        processed_text = ''.join([char + ' ' if char.lower() in vowels else char for char in text])
        text_file = audio_file.replace('.wav', '.txt')
        words = nltk.word_tokenize(text)
        for word in words:
          liste_words.append(word)  
        # Écriture du texte dans le fichier
        with open(text_file, 'w') as file:
            file.write(processed_text)

        #print(liste_words)
        return liste_words
#---------------------------------------------------------------------------------------------------------------------------  
def RunscriptPraat(Scriptname,scriptParam1,scriptParam2):
    praat_path = "Praat.exe"
    script_path = Scriptname
    param1 = scriptParam1
    param2 = scriptParam2
    if param1 == ' ':
        script_path = "pitch.psc"
        command = [praat_path, "--run", script_path]
        subprocess.run(command)
    else:
        command = [
            praat_path,
            "--run",
            script_path,
            param1,
            param2
    ]
    subprocess.run(command)
#---------------------------------------------------------------------------------------------------------------------------
nom_sans_extension = ""
@app.route('/api/string', methods=['POST'])
def receive_string():
    string_data = request.form['string']
    EntryPoint = request.form['Entry']
    ExitPoint = request.form['Exit']
    Threshold = request.form['Threshold']
    Fb = request.form['Fb']
    Alpha = request.form['Alpha']
    autopackverif = request.form['Autopac']
    print(autopackverif)
    global nom_sans_extension
    nom_sans_extension = string_data.split(".")[0]
    RunscriptPraat('soundToPitch.psc',nom_sans_extension+'.wav',nom_sans_extension+'.Pitch')
    PitchCorection(nom_sans_extension+'.Pitch')
    RunscriptPraat('pitch.psc', ' ', ' ')
    if file_exists(nom_sans_extension+'.PAC'):
        print("Le fichier existe.")
        if(autopackverif == 'true'):
            runinterpolation(nom_sans_extension+'.f0_ascii',EntryPoint,ExitPoint,Threshold,Fb,Alpha)
    else:
        #print("Le fichier n'existe pas.")  
        runinterpolation(nom_sans_extension+'.f0_ascii',EntryPoint,ExitPoint,Threshold,Fb,Alpha)
    with open(nom_sans_extension+'.PAC', 'r') as file:
        lignes = file.readlines()
        fb_file = float(lignes[9].strip())
    #print(fb_file)
    Fb = fb_file
    print("Chaîne reçue :", string_data)
    liste_words = getTextfromSound(string_data)
    extractInternsityFromPitch(nom_sans_extension+'.Pitch') 
    valeurs = getParametre(nom_sans_extension+'.PAC').split()
    liste_lignes = lire_fichier_texte(nom_sans_extension+'.PAC')
    Acsent_valeurs = extraire_valeurs(liste_lignes)
    Phrase_valeurs = extraire_valeursPhrase(liste_lignes)
    #print(Acsent_valeurs)
    phrase_contour = []
    
    # Attribution des valeurs aux variables nom_sans_extension+'.PAC'
    valeur1 = float(valeurs[0])
    valeur2 = float(valeurs[1])
    valeur3 = float(valeurs[2])
    valeur4 = float(valeurs[3])
    k=valeur2*100+1
    #print(k)
    Acsent_contour = []
    f0_contour = []
    for i in range(0, int(k)):
        tt  = i / 100
        Acsent_contour.append(ToneComponent(tt,Acsent_valeurs))
        phrase_contour.append(PhraseComponent(tt,Phrase_valeurs))
    #print(Acsent_contour)
    
    son = parselmouth.Sound(nom_sans_extension+'.wav')
    #print(str(valeur1)+' '+str(valeur2)+' '+str(valeur3)+' '+str(valeur4))
    
    #phrase_contour = phrase_command_amplitude_interne(int(valeur2*100+1),valeur1,valeur2,valeur3,valeur4)
    #print(Phrase_valeurs)
    timeline = phrase_command_Time(valeur2,int(valeur2*100+1))
    f0_contour = getf0contour(phrase_contour,Acsent_contour,float(Fb))
    print('ici lta7t')
   # print(liste_words)
    List_seg = segm_list(nom_sans_extension+'.wav')
    print(List_seg)
    data = {'liste1': phrase_contour, 'Phrase_valeurs':Phrase_valeurs,'wavLeng':k ,'liste2':Acsent_contour,'Acsent_valeurs':Acsent_valeurs,'f0_contour':f0_contour,'fb':float(Fb),'List_seg':List_seg,'liste_words':liste_words}
    json_data = json.dumps(data)
    return json_data
#---------------------------------------------------------------------------------------------------------------------------
def file_exists(file_path):
    return os.path.exists(file_path)
#---------------------------------------------------------------------------------------------------------------------------
@app.route('/api/PhraseAPcontour', methods=['POST'])
def phrase_command_amplitude_externe():
    t = int(request.form['t'])
    T0 = float(request.form['T0'])
    T0e = float(request.form['T0e'])
    Ap = float(request.form['Ap'])
    #print("ici les valeurs initials : "+str(t),str(T0),str(T0e),str(Ap))
    alpha = 2
    k = np.linspace(0, (t-1)/100, t)
    amplitude= np.zeros_like(k)
    mask = np.logical_and(k >= T0, k < T0e)
    amplitude[mask] = Ap*np.square(alpha)*(k[mask] - T0)*np.exp(-alpha * (k[mask] - T0))
    #amplitude[mask] = np.square(alpha)* np.exp(-alpha*(k[mask] - T0))
    return amplitude.tolist()
#---------------------------------------------------------------------------------------------------------------------------
def extractInternsityFromPitch(x):
# Nom du fichier d'entrée
    input_file = x

# Nom du fichier de sortie
    output_file = input_file.split(".")[0] + "_intensity.txt"

# Lecture du fichier d'entrée
    with open(input_file, 'r') as file:
        data = file.readlines()

# Extraction des numéros de frame et des intensités
    frame_counter = 0
    frames = []
    intensities = []

    for line in data:
        if "frame" in line:
            frame_counter += 1
            frames.append(frame_counter)
            intensity = None
        if "intensity" in line:
            intensity = line.split(" = ")[1].strip()
            if intensity != '':
                if len(intensities) < frame_counter:
                    intensities.append(intensity)
                else:
                    intensities[frame_counter - 1] = intensity

# Écriture des numéros de frame et des intensités dans le fichier de sortie
    with open(output_file, 'w') as file:
        for frame, intensity in zip(frames, intensities):
            file.write(str(frame) + " " + str(intensity) + "\n")

    print("Les numéros de frame et les intensités ont été extraits avec succès dans le fichier", output_file)

#---------------------------------------------------------------------------------------------------------------------------
def Segmentation():
    # Nom du fichier d'entrée
    input_file = "1685556325607.txt"

    # Lecture du fichier d'entrée
    with open(input_file, 'r') as file:
        data = file.readlines()

    # Extraction des intensités
    intensities = [float(line.split()[1]) for line in data]

    # Variables pour le traitement
    threshold_factor = 1.4
    periods = []
    start_index = 0

    # Parcours des intensités à partir de l'index de départ
    for i in range(1, len(intensities)):
        current_intensity = intensities[i]
        previous_intensity = intensities[i-1]

        # Vérification de l'augmentation d'intensité
        if current_intensity >= previous_intensity * threshold_factor:
            # Vérification des 5 lignes suivantes
            if all(intensities[j] >= current_intensity for j in range(i+1, i+6)):
                end_index = i
                periods.append((start_index + 1, end_index))
                start_index = end_index

    # Affichage des périodes détectées
    #for i, period in enumerate(periods):
        #print("Période", i+1, ":", "Commence à", period[0], "Finit à", period[1])

#---------------------------------------------------------------------------------------------------------------------------
def phrase_command_amplitude_interne(t, T0, T0e, Ap, alpha): 
    k = np.linspace(0, (t-1)/100, t)
    amplitude= np.zeros_like(k)
    mask = np.logical_and(k >= T0, k < T0e)
    amplitude[mask] = Ap*np.square(alpha)*(k[mask] - T0)*np.exp(-alpha * (k[mask] - T0))
    return amplitude.tolist()
#---------------------------------------------------------------------------------------------------------------------------
def getParametre(x):
    file_path = x 

    # Lecture du fichier
    with open(file_path, 'r') as file:
        lines = file.readlines()

    # Suppression des espaces vides et des caractères de nouvelle ligne
    lines = [line.strip() for line in lines if line.strip()]

    # Extraction de la ligne spécifique
    data_line = lines[8]  

    # Traitement des données
    values = data_line.split()

    # Attribution des valeurs aux variables
    a = float(values[0])
    b = float(values[1])
    c = float(values[2])
    d = float(values[3])
    return str(a)+' '+str(b)+' '+str(c)+' '+str(d)

#---------------------------------------------------------------------------------------------------------------------------
def phrase_command_Time(x,y):
    t = np.linspace(0, x, y)
    return t.tolist()
#---------------------------------------------------------------------------------------------------------------------------
def Gp(t, alpha):
    if t >= 0.0:
        return math.pow(alpha, 2.0) * t * math.exp(-alpha * t)
    else:
        return 0.0
#---------------------------------------------------------------------------------------------------------------------------
@app.route('/api/AddParametrePhrase', methods=['POST'])
def AddPhraseParametres():
    
    data = request.json
    objets = data['Objet']
    t = data['t']
    
    
    
    
    #print(t)
    t0 = objets[0]['t0'] 
    for objet in objets:
        if objet['t0'] < t0: 
            t0 = objet['t0']
    valeur1 = t0/100
    valeur2 = t/100
    valeur3 = objets[0]['ap']
    valeur4 = 2
   
    phrase_contour = []
    phrase_contourx = []
    k = np.linspace(0, (t-1)/100, t)
    amplitude= np.zeros_like(k)
    mask = np.logical_and(k >= t0/100, k < t/100)
    #print(k)
    #print(mask)
    valeur1 = objets[0]['t0']/100
    valeur2 = t/100
    valeur3 = objets[0]['ap']
    valeur4 = 2
    phrase_contourx = phrase_command_amplitude_interne(int(valeur2*100+1),valeur1,valeur2,valeur3,valeur4)
    #print('aaaaaaaaaaaaaaaaaaaaaaaaaaaaa'+str(len(objets)))
    if(len(objets)== 1):
        data = {'liste1': phrase_contourx}
        json_data = json.dumps(data)
        objets = []
        return json_data
    for i in range(len(objets)-1):
        valeur1 = objets[i+1]['t0']/100
        valeur2 = t/100
        valeur3 = objets[i+1]['ap']
        valeur4 = 2
        phrase_contour = phrase_command_amplitude_interne(int(valeur2*100+1),valeur1,valeur2,valeur3,valeur4)
        
        for i in range(len(phrase_contour)):
            phrase_contourx[i] = phrase_contourx[i]+ phrase_contour[i]
    #print(phrase_contourx)
    data = {'liste1': phrase_contourx}
    objets = []
    json_data = json.dumps(data)
    return json_data
def extraire_valeursPhrase(liste_lignes):
    
    nb_lignes = int(liste_lignes[7])  # Ligne 8 indiquant le nombre de lignes à prendre
    ligne_debut = 20   # Ligne à partir de laquelle commencent les valeurs
    #print(ligne_debut)

    valeurs = []
    for i in range(ligne_debut, ligne_debut + nb_lignes):
        valeurs.extend(liste_lignes[i].split())

    return valeurs
def Gp(t, alpha):
    if t >= 0.0:
        return pow(alpha, 2.0) * t * math.exp(-alpha * t)
    else:
        return 0.0
def PhraseComponent(t, listParametres):
    dPhraseCom = 0.0
    m = 0
    for i in range(0, int((len(listParametres)/4)),1):
        dPhraseCom += float(listParametres[m+2]) * Gp(t - float(listParametres[m]), float(listParametres[m+3]))
        m += 4
    return dPhraseCom
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#------------------------------------------------------Acsent contour-------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
def lire_fichier_texte(nom_fichier):
    with open(nom_fichier, 'r') as file:
        lines = file.readlines()

    return [line.strip() for line in lines]

def extraire_valeurs(liste_lignes):
    nb_lignes_deb = int(liste_lignes[7])
    nb_lignes = int(liste_lignes[8])  # Ligne 9 indiquant le nombre de lignes à prendre
    ligne_debut = 21 + nb_lignes_deb -1   # Ligne à partir de laquelle commencent les valeurs
    #print(ligne_debut)

    valeurs = []
    for i in range(ligne_debut, ligne_debut + nb_lignes):
        valeurs.extend(liste_lignes[i].split())

    return valeurs
#---------------------------------------------------------------------------------------------------------------------------
def Gt(t, beta):
    if t >= 0.0:
        r = 1.0 - ((1.0 + (beta * t)) * math.exp(- beta * t))

        if r < 0.9:
            return r
        else:
            return 0.9
    else:
        return 0.0
def ToneComponent(t, listParametres):
    dToneCom = 0.0
    m = 0
    #print((len(listParametres)/4)-1)
    for i in range(0, int((len(listParametres)/4)),1):
        #print(m)
        dToneCom += float(listParametres[m+2]) * (Gt(t - float(listParametres[m]), float(listParametres[m+3])) - Gt(t - float(listParametres[m+1]), float(listParametres[m+3])))
        m += 4
    return dToneCom
@app.route('/api/AddParametreAcsent', methods=['POST'])
def AddToneParametres():
    Acsent_contour = []
    data = request.json
    objets = data['Objet']
    t = data['t']
    #print(t)
    #print(objets)
    m = 0
    valeurs = []

    for element in objets:
        for cle, valeur in element.items():
            if cle == 't0' or cle == 't1':
                valeur = valeur / 100
            valeurs.append(valeur)
    #print(valeurs)
    for i in range(0, int(t)):
        tt  = i / 100
        Acsent_contour.append(ToneComponent(tt,valeurs))
    #print(Acsent_contour)
    data = {'liste1': Acsent_contour}
    json_data = json.dumps(data)
    return data
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#------------------------------------------------------f0 contour-------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
def getf0contour(list1,list2,fb):
    list3=[]
    p = 0.0
    o = 0.0
    #print(list1,list2)
    for i in range(0, len(list1),1):
        if(list1[i]>0): 
            for j in range(i, len(list1),1):
                p+=list1[i]
        if(list1[i]<=0):
                p=0
        if(list2[i]>0):
            for j in range(i, len(list2),1):
                o+=list2[i]
        if(list2[i]<=0):
                o=0
        list3.append(fb+o+p)
        #print(fb+o+p)
        p = 0.0
        o = 0.0
    #print(list3)
    return list3
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#------------------------------------------------------segmentation phonetic------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
def detect_first_waveform_exceed(audio_file_path, threshold=0.4):
    # Charger le fichier audio
    y, sr = librosa.load(audio_file_path)

    # Parcourir le waveform pour détecter le premier indice où l'amplitude dépasse le seuil
    for i, amp in enumerate(y):
        if abs(amp) > threshold:
            # Convertir l'indice en temps (secondes)
            time_exceeding_threshold = librosa.samples_to_time(i, sr=sr)
            return time_exceeding_threshold

    # Si aucun dépassement n'a été détecté, retourner None
    return None
def convert_audio_to_text(audio_file):
    recognizer = sr.Recognizer()
    with sr.AudioFile(audio_file) as source:
        audio = recognizer.record(source)
    text = recognizer.recognize_google(audio, language='de-DE')
    return text

def get_phonetic_transcription(word):
    pronouncing_dict = cmudict.dict()
    word = word.lower()
    if word in pronouncing_dict:
        return pronouncing_dict[word][0]
    else:
        return None

def segment_sentence(text,start_time):
    german_vowels = ["a", "e", "i", "o", "u", "ä", "ö", "ü"]
    words = nltk.word_tokenize(text)
    segments = []
    current_start_time = start_time
    for word in words:
        #print(word)
        transcription = get_phonetic_transcription(word)
        #print(transcription)
        if word:
            
            word_length = len(word) / 30  # Estimation de la longueur du mot en secondes
            for char in word:
                if char.lower() in german_vowels:
                    word_length = word_length + 0.05
            current_end_time = current_start_time + word_length
            segment = {
                'start_time': current_start_time,
                'end_time': current_end_time,
                'text': word
            }
            segments.append(segment)
            current_start_time = current_end_time
    return segments
def segm_list(audio_file_path):
    list_segment  = []
    values = []
    nom_sans_extension = audio_file_path.split(".")[0]
    textgridpath = nom_sans_extension+".TextGrid"
    if os.path.exists(textgridpath):
        print("Le fichier existe.aaaaaa")
        values.append('0')
        with open(textgridpath, 'r') as file:
            lines = file.readlines()[14:]  # Commence à lire à partir de la ligne 15
            for line in lines:
                match = re.search(r'xmax = ([\d.]+)', line)
                if match:
                    value = match.group(1)
                    values.append(value)

        return(values)
    else:
        temp = 0
        time_exceeding_threshold = detect_first_waveform_exceed(audio_file_path, 0.45)
        #print("temp de depart : ",time_exceeding_threshold)
        text = convert_audio_to_text(audio_file_path)
        segments = segment_sentence(text,time_exceeding_threshold)
        for idx, segment in enumerate(segments):
            #print(f"Interval {idx + 1}: debut {segment['start_time']}, fin {segment['end_time']}, text '{segment['text']}'")
            list_segment.append(segment['start_time'])
            temp = segment['end_time']
        list_segment.append(temp)
        #print(list_segment)
        return(list_segment)
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#------------------------------------------------------Resynthesis----------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------------------------------------------
@app.route('/api/resynthesis', methods=['POST'])
def Resynthesis():
    listevalue = request.json
    print('data recuperer',listevalue)
    with open(nom_sans_extension+'.PitchTier', 'w') as f:
        f.write("File type = "'"ooTextFile"')
        f.write("\nObject class = "'"PitchTier"')
        f.write("\n")
        f.write("\nxmin = 0")
        f.write("\nxmax = "+str(len(listevalue)/100))
        f.write("points: size = "+str(len(listevalue)))
        for i in range(0, len(listevalue),1):
            f.write(f"\npoints [{i+1}]:")
            f.write("\n    number = "+str((i+1)/100)+"")
            f.write("\n    value = "+str(listevalue[i])+"")
    sound = parselmouth.Sound(nom_sans_extension+".wav")
    manipulation = call(sound, "To Manipulation", 0.01, 50, 400)
    pitch_tier = parselmouth.Data.read(nom_sans_extension+".PitchTier")
    call([pitch_tier, manipulation], "Replace pitch tier")
    sound_octave_up = call(manipulation, "Get resynthesis (overlap-add)")
    sound_octave_up.save("Resynthesis"+nom_sans_extension+".wav", "WAV")
    resynthesized_audio_path = "Resynthesis" + nom_sans_extension + ".wav"
  
    return jsonify("Resynthesis" + nom_sans_extension + ".wav")

if __name__ == '__main__':
     app.run()
    

