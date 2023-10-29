form ExtractPitch

    sentence AudioFilePath
    sentence PitchFilePath

endform

# Charge le fichier audio
Read from file: "'AudioFilePath$'"

# Extrait le pitch
To Pitch: 0.01, 50, 400
    # Les valeurs entre parenthèses sont les paramètres pour l'extraction du pitch.
    # Vous pouvez les ajuster selon vos besoins.

# Sauvegarde le fichier .Pitch
Save as text file: "'PitchFilePath$'"

# Ferme les objets ouverts
Remove

