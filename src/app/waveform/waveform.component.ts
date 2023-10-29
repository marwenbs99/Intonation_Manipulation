import { Component, ElementRef, OnInit, ViewChild, Renderer2 } from '@angular/core';
import WaveSurfer from 'wavesurfer.js';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { NgZone } from '@angular/core';
import { finalize, last } from 'rxjs/operators';
import 'tslib';
import { NgbModal, ModalDismissReasons, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';


export function thresholdValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const value = control.value;
    if (value !== null && (isNaN(value) || value < 0.000001 || value > 0.00001)) {
      return { 'thresholdRange': true };
    }
    return null;
  }
}
export function fbValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const value = control.value;
    if (value !== 'auto' && (isNaN(value) || value < 0 || value > 120)) {
      return { 'fbInvalid': true };
    }
    return null;
  };
}


export class AcsentParametres {
  t0: any;
  t1: any
  ap: any;
  beta: any;
}
export class PhraseParametres {
  t0: any;
  ap: any;
}

Chart.register(...registerables);
@Component({
  selector: 'app-waveform',
  templateUrl: './waveform.component.html',
  styleUrls: ['./waveform.component.css']
})


export class WaveformComponent implements OnInit {
  @ViewChild('singleInput', { static: false })
  singleInput!: ElementRef;
  wavesurfer: any;
  wavesurferF0: any;
  path: any;
  title = 'uploadfile';
  files: any;
  filePAC: any;
  subscriptions = new Subscription();
  pathi: any;
  chart!: Chart;
  timer: any
  amplitude: any
  xCoor: any
  yCoor: any
  Phrase_valeurs: any
  Tone_valeurs: any
  x: any
  y: any;
  a: any
  b: any
  m: any
  k: any
  c: any
  ListParametresPhrase: PhraseParametres[] = [];
  ListParametresAcsent: AcsentParametres[] = [];
  index: any
  index1: any
  index2: any
  liste1F0: any
  listefb: any
  t0 = 0
  ap = 0
  t0e = 0
  Action = 'move'
  loading: boolean = false;
  chart2!: Chart
  chart3!: Chart
  closeResult: any;
  result: any
  addFormMarque!: FormGroup
  EntryPoint = 0;
  ExistPoint = 4;
  Threshold = 1e-6;
  Fb = 'auto';
  fbparam: any;
  Alpha = 2.0;
  savedCanvasStyles: any
  autopac: boolean = false;
  fileContent: any;
  downloadFile:any;

  constructor(private http: HttpClient, private ngZone: NgZone, private formBuilder: FormBuilder, private modalService: NgbModal, private renderer: Renderer2,private route: ActivatedRoute) {
    
    this.addFormMarque = this.formBuilder.group({
      Entry: [null, [Validators.required, Validators.min(0), Validators.max(5), Validators.pattern("^[0-5]$")]],
      Exit: [null, [Validators.required, Validators.min(0), Validators.max(5), Validators.pattern("^[0-5]$")]],
      Threshold: [null, [Validators.required, thresholdValidator()]],
      Fb: [null, [Validators.required, fbValidator()]],
      Alpha: [null, [Validators.required, Validators.min(0), Validators.max(5), Validators.pattern("^[0-5]$")]],
    });


  } ngOnInit() {
    this.wavesurfer = WaveSurfer.create({
      container: '#waveform',
      waveColor: 'violet',
      progressColor: 'purple'
    });

    this.route.paramMap.subscribe(params => {
      const myData = window.history.state.myData;
      console.log('aaaaaaaaa',myData.path); 
      this.path = myData.path;
      this.files = myData.files
      this.loadWaveform()
      
    });

  }


  //**********************************************************************************************************************************/
  //**********************************************************************************************************************************/
  //******************************************************************Phrase contour**************************************************/
  //**********************************************************************************************************************************/
  //**********************************************************************************************************************************/
  PhrasecontourChart(x: any, Phrase_valeurs: any, wavLeng: any) {


    const canvas = document.getElementById('myChart') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (this.chart) {
      this.chart.destroy()
    }

    const chartData = [];
    let m = 0;
    const labels = Array.from({ length: wavLeng }, (_, index) => index);
    if (ctx) {
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Phrase contour',
              data: x,
              borderColor: 'blue',
              fill: false,
              borderWidth: 1,
              tension: 1
            },

          ]
        },
        options: {
          scales: {
            x: {
            },
            y: {
              max: 1,
              min: -1
            },
          },
        },

      })
    }

    this.getPhraseParametres(Phrase_valeurs)

    this.setupEventListeners();

  }
  private setupEventListeners() {
    this.chart.update()
    const { data, scales: { x, y } } = this.chart;
    this.chart.canvas.addEventListener('mousedown', (e) => {
      this.c = x.getValueForPixel(e.offsetX)
      //######################################### detection d'index  du point<<parmetre>> a bouger ######################################### 
      if (this.chart.data.datasets.length > 2) {
        const dataPoint = this.chart.data.datasets[1].data[0];
        if (dataPoint !== null && typeof dataPoint !== 'number') {

          if ((this.xCoor - dataPoint.x) < 0) {
            this.k = (this.c - dataPoint.x) * -1
          } else {
            this.k = (this.c - dataPoint.x)
          }
          this.index = 1
          for (let i = 2; i <= this.chart.data.datasets.length - 1; i++) {
            const datapoints = this.chart.data.datasets[i].data[0]
            if (datapoints !== null && typeof datapoints !== 'number') {

              this.m = this.c - datapoints.x
              if (this.m < 0) {
                this.m = this.m * -1
              }
              if (this.k >= this.m) {
                this.k = this.m
                this.index = i
              }
              this.m = datapoints.x
            }
          }

        }
      } else {
        this.index = 1
      }
      //#################################################################################################################################       

      //this.a = this.getMousePosition_A(this.chart,e)
      //this.b = this.getMousePosition_B(this.chart,e)

      this.startMouseTracking(this.chart);


    });

  }

  private startMouseTracking(chart: any) {

    const mouseMoveHandler = (e: MouseEvent) => {
      if (this.Action == 'move') {

        const { data, scales: { x, y } } = chart;
        this.xCoor = e.offsetX;
        this.yCoor = e.offsetY;
        this.x = (x.getValueForPixel(this.xCoor))
        this.y = y.getValueForPixel(this.yCoor)
        data.datasets[this.index].data[0].y = this.y
        data.datasets[this.index].data[0].x = this.x
        data.datasets[this.index].data[1].y = 0
        data.datasets[this.index].data[1].x = this.x
       } this.chart.update()
    }
    const mouseUpHandler = (e: MouseEvent) => {
      const { data, scales: { x, y } } = chart;
      this.chart.canvas.removeEventListener('mousemove', mouseMoveHandler);
      //######################################### ajouter un point de parametre phrase (t0,ap) ######################################### 
      if (this.Action == 'add') {
        this.xCoor = e.offsetX;
        this.yCoor = e.offsetY;
        this.x = (x.getValueForPixel(this.xCoor))
        this.y = y.getValueForPixel(this.yCoor)
        const newDataset = {
          data: [
            { x: this.x, y: this.y }, { x: this.x, y: 0 },
          ],
          label: 'Phrase Paramtre ' + data.datasets.length,
          pointRadius: 7,
          backgroundColor: 'rgba(' + Math.floor(Math.random() * 256) + ', ' + Math.floor(Math.random() * 256) + ', ' + Math.floor(Math.random() * 256) + ', 1)',
          borderColor: 'rgba(' + Math.floor(Math.random() * 256) + ', ' + Math.floor(Math.random() * 256) + ', ' + Math.floor(Math.random() * 256) + ', 1)',
          borderWidth: 1
        };
        chart.data.datasets.push(newDataset);

        this.Action = 'move'
        //#################################################################################################################################  
      }
      this.updatechart()

    };

    this.chart.canvas.addEventListener('mousemove', mouseMoveHandler);
    this.chart.canvas.addEventListener('mouseup', mouseUpHandler);

  }
  clearChart() {
    if (this.chart) {
      this.chart.destroy(); // Détruire l'instance du graphique existant
      // Réinitialiser la variable du graphique
    }
  }
  ngOnDestroy() {
    // se désabonner de tous les abonnements lors de la destruction du composant
    this.subscriptions.unsubscribe();
  }

  loadWaveform() {


    this.wavesurfer.load(this.path);


  }
  play() {
    this.wavesurfer.play();
  }

  pause() {
    this.wavesurfer.pause();
  }

  stop() {
    this.wavesurfer.stop();
  }

  restart() {
    this.wavesurfer.seekTo(0);
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      const file: File = event.target.files[0];
      const filePath: string = URL.createObjectURL(file);
      console.log("ici "+file)
      this.path = filePath;
      this.loadWaveform()
      this.files = file;
    }
  }
 onFileSelectedTextGrid(event: any){
  if (event.target.files.length > 0) {
    const file: File = event.target.files[0];
    console.log("ici",file.name)
    const fileNameWithoutExtension = this.files.name.replace(/\.[^/.]+$/, '');
    const newFileName = fileNameWithoutExtension + '.TextGrid';
    const renamedFile = new File([file], newFileName, { type: file.type });
    const formData = new FormData();
    formData.append('file', renamedFile);
    this.http.post("http://localhost:3000/file", formData).subscribe(
        (response) => {
          console.log('Fichier téléchargé avec succès sur le serveur.');
        },
        (error) => {
          console.error('Erreur lors du téléchargement du fichier sur le serveur :', error);
        }
      );
  }
 }
  async onFileSelectedPAC(event: any, content:any) {
    if (event.target.files.length > 0) {
      const file: File = event.target.files[0];
      const fileNameWithoutExtension = this.files.name.replace(/\.[^/.]+$/, '');
      const newFileName = fileNameWithoutExtension + '.PAC';
      const renamedFile = new File([file], newFileName, { type: file.type });
  
      const modalRef = this.modalService.open(content);
      await modalRef.closed.toPromise();

      console.log(renamedFile);
      this.filePAC = renamedFile;
      const formData = new FormData();
      formData.append('file', this.filePAC);
      this.http.post("http://localhost:3000/file", formData).subscribe(
        (response) => {
          console.log('Fichier téléchargé avec succès sur le serveur.');
        },
        (error) => {
          console.error('Erreur lors du téléchargement du fichier sur le serveur :', error);
        }
      );

    }
    this.onSubmit()
  }

  onSubmit() {
    // construct foormdata
    this.loading = true;
    const formdata = new FormData()
    formdata.append('file', this.files)
    // poost request to express backend
    this.http.post<any>("http://localhost:3000/file", formdata).subscribe((res) => {
      res.path = res.path.replace("uploads\\", "")
      console.log(res.path)

      this.sendStringToServerPython(res.path, this.autopac);



    })



  }
  autopacVerif() {
    this.autopac = true
  }


  sendStringToServerPython(str: string, autooopackverf: any) {
    this.loading = true;
    const url = 'http://localhost:5000/api/string';
    const formdata = new FormData()
    formdata.append('string', str)
    formdata.append("Entry", this.addFormMarque.value.Entry);
    formdata.append("Exit", this.addFormMarque.value.Exit);
    formdata.append("Threshold", this.addFormMarque.value.Threshold);
    formdata.append("Fb", this.addFormMarque.value.Fb);
    formdata.append("Alpha", this.addFormMarque.value.Alpha);
    formdata.append("Autopac", autooopackverf);
    this.autopac = false
    const body = { string: str };
    this.http.post(url, formdata).pipe(

      finalize(() => {
        this.ngZone.run(() => {
          this.loading = false;
        });
      })
    ).subscribe((response: any) => {
      this.PhrasecontourChart(response.liste1, response.Phrase_valeurs, response.wavLeng)
      this.AcsentcontourChart(response.liste2, response.wavLeng, response.Acsent_valeurs)
      this.fbparam = response.fb
      this.chart.update()
      this.liste1F0 = []
      this.liste1F0 = this.chart.data.datasets[0].data
      this.listefb = []
      console.log('ici la liste 1 : ', response.liste1)
      for (let i = 0; i < this.liste1F0.length; i++) {

        this.liste1F0[i] = ((this.liste1F0[i] * (response.liste1.length - i))) + response.fb
        this.listefb[i] = response.fb
      }

      this.f0_contour(response.f0_contour, response.wavLeng, response.liste1, this.listefb, response.List_seg, response.liste_words)

      this.liste1F0 = []
      this.listefb = []
    },
      error => console.log(error)
    );
  }

  addPointParametre() {
    this.Action = 'add'
  }

  deleteLastPoint() {

    const { data, scales: { x, y } } = this.chart;
    console.log('suppression en cours .... ' + data.datasets.length)
    if (data.datasets.length > 2) {

      this.chart.data.datasets.pop(); // Supprime la dernière dataset de l'array

    }
    this.updatechart()

  }

  updatechart() {
    for (let i = 1; i <= this.chart.data.datasets.length - 1; i++) {
      const dataPoint = this.chart.data.datasets[i].data[0];
      if (dataPoint !== null && typeof dataPoint !== 'number') {

        const PHparametre = new PhraseParametres();
        PHparametre.t0 = dataPoint.x;
        PHparametre.ap = dataPoint.y;
        this.ListParametresPhrase.push(PHparametre);
      }
    }

    const dataa = {
      Objet: this.ListParametresPhrase,
      t: this.chart.data.labels?.length
    };
    this.http.post<any>('http://localhost:5000/api/AddParametrePhrase', dataa)
      .subscribe(response => {
        this.chart.data.datasets[0].data = response.liste1
        this.chart.update()
        this.f0_update(this.chart.data.datasets[0].data, this.chart2.data.datasets[0].data, this.fbparam)
        this.chart3.update()
      });
    this.ListParametresPhrase = []
  }
  getPhraseParametres(Phrase_valeurs: any) {

    let m = 0





    for (let i = 0; i < Phrase_valeurs.length / 4; i++) {
      const dataPoint = { x: Math.round(Phrase_valeurs[m] * 100), y: parseFloat(Phrase_valeurs[m + 2]) };

      const newDataset = {
        data: [
          { x: Math.round(Phrase_valeurs[m] * 100), y: parseFloat(Phrase_valeurs[m + 2]) }, { x: Math.round(Phrase_valeurs[m] * 100), y: 0 }
        ],
        label: 'Phrase Paramtre ' + i,
        pointRadius: 7,
        backgroundColor: 'rgba(255, 0, 0, 1)',
        borderColor: 'rgba(255, 0, 0, 1)',
        borderWidth: 1,

      };
      this.chart.data.datasets.push(newDataset);
      m += 4
    }

  }


  //**********************************************************************************************************************************/
  //**********************************************************************************************************************************/
  //******************************************************************Acsent contour**************************************************/
  //**********************************************************************************************************************************/
  //**********************************************************************************************************************************/
  AcsentcontourChart(x: any, wavLeng: any, Acsent_valeurs: any) {
    if (this.chart2) {
      this.chart2.destroy();
    }
    const canvass = document.getElementById('myChart2') as HTMLCanvasElement;
    const ctxx = canvass.getContext('2d');
    const labels = Array.from({ length: wavLeng }, (_, index) => index);

    if (ctxx) {
      this.chart2 = new Chart(ctxx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Tone contour',
              data: x,
              borderColor: 'blue',
              fill: false,


            }

          ]
        },
        options: {
          scales: {
            x: {

            },
            y: {
              max: 1,
              min: -1 // Définir la valeur maximale de l'échelle y à 1
            },
          },

        }

      })
    }

    this.InsertAcsentParametre(Acsent_valeurs)
    this.setupEventListeners1()

  }
  InsertAcsentParametre(xx: any) {
    let m = 0;

    for (let i = 0; i < xx.length / 4; i++) {
      const chartData = [];
      const dataPoint2 = { x: Math.round(xx[m] * 100), y: 0 };
      chartData.push(dataPoint2);
      const dataPoint = { x: Math.round(xx[m] * 100), y: xx[m + 2] };
      chartData.push(dataPoint);
      const dataPoint1 = { x: Math.round(xx[m + 1] * 100), y: xx[m + 2] };
      chartData.push(dataPoint1);
      const dataPoint3 = { x: Math.round(xx[m + 1] * 100), y: 0 };
      chartData.push(dataPoint3);


      m = m + 4;

      const newDataset = {
        label: 'Tone Parametre ' + i,
        data: chartData,
        pointRadius: 7,
        backgroundColor: 'rgba(255, 0, 0, 1)',
        borderColor: 'rgba(255, 0, 0, 1)',
        borderWidth: 1
      };

      this.chart2.data.datasets.push(newDataset);
    }
    this.chart2.update();
  }
  private setupEventListeners1() {
    this.chart2.update()
    let lastvalue: any
    const { data, scales: { x, y } } = this.chart2;




    this.chart2.canvas.addEventListener('mousedown', (e) => {
      let xx = x.getValueForPixel(e.offsetX)
      const datapoints1er = this.chart2.data.datasets[1].data[1]
      if (datapoints1er && typeof datapoints1er !== 'number' && xx) {
        lastvalue = Math.abs(xx - datapoints1er.x)
      }



      if (this.chart2.data.datasets.length > 2) {

        for (let i = 1; i <= this.chart2.data.datasets.length - 1; i++) {

          const datapoints1 = this.chart2.data.datasets[i].data[1]//////////////////////////////////////////////////////////////////////////////////ici
          const datapoints2 = this.chart2.data.datasets[i].data[2]

          if (datapoints1 && typeof datapoints1 !== 'number' && xx && datapoints2 && typeof datapoints2 !== 'number') {
            let aa = Math.abs(xx - datapoints1.x)
            let bb = Math.abs(xx - datapoints2.x)
            if (aa <= lastvalue) {
              this.index1 = i
              this.index2 = 1
              lastvalue = aa
            }
            if (bb < lastvalue) {
              this.index1 = i
              this.index2 = 2
              lastvalue = bb
            }


          }


        }



      }
      else {
        const datapoints1 = this.chart2.data.datasets[1].data[1]
        const datapoints2 = this.chart2.data.datasets[1].data[2]
        if (datapoints1 && typeof datapoints1 !== 'number' && xx && datapoints2 && typeof datapoints2 !== 'number') {
          let aa = Math.abs(xx - datapoints1.x)
          let bb = Math.abs(xx - datapoints2.x)
          if (aa < lastvalue) {
            this.index1 = 1
            this.index2 = 1
            lastvalue = aa
          }
          if (bb < lastvalue) {
            this.index1 = 1
            this.index2 = 2
            lastvalue = bb
          }

        }


      }

      this.startMouseTracking1(this.chart2)
    });

  }
  private startMouseTracking1(chart: any) {
    const mouseMoveHandler = (e: MouseEvent) => {
      if (this.Action == 'move') {
        const { data, scales: { x, y } } = chart;
        let xx = x.getValueForPixel(e.offsetX)
        let yy = y.getValueForPixel(e.offsetY)
        data.datasets[this.index1].data[this.index2].y = yy
        data.datasets[this.index1].data[this.index2].x = xx

        if (this.index2 == 1) {
          data.datasets[this.index1].data[2].y = yy
          data.datasets[this.index1].data[0].x = xx
        } else {
          data.datasets[this.index1].data[1].y = yy
          data.datasets[this.index1].data[3].x = xx
        }
      }
      this.chart2.update()
    }
    const mouseUpHandler = (e: MouseEvent) => {
      const { data, scales: { x, y } } = chart;
      let xx = x.getValueForPixel(e.offsetX)
      let yy = y.getValueForPixel(e.offsetY)
      this.chart2.canvas.removeEventListener('mousemove', mouseMoveHandler);
      if (this.Action == 'add' && xx && yy) {
        const chartData = [];
        const dataPoint2 = { x: xx - 25, y: 0 };
        chartData.push(dataPoint2);
        const dataPoint = { x: xx - 25, y: yy };
        chartData.push(dataPoint);
        const dataPoint1 = { x: xx, y: yy };
        chartData.push(dataPoint1);
        const dataPoint3 = { x: xx, y: 0 };
        chartData.push(dataPoint3);
        const newDataset = {
          label: 'Tone Parametre ',
          data: chartData,
          pointRadius: 7,
          backgroundColor: 'rgba(' + Math.floor(Math.random() * 256) + ', ' + Math.floor(Math.random() * 256) + ', ' + Math.floor(Math.random() * 256) + ', 1)',
          borderColor: 'rgba(' + Math.floor(Math.random() * 256) + ', ' + Math.floor(Math.random() * 256) + ', ' + Math.floor(Math.random() * 256) + ', 1)',
          borderWidth: 1
        };
        chart.data.datasets.push(newDataset);

        this.Action = 'move'

      }

      this.updatechart1()
    };

    this.chart2.canvas.addEventListener('mousemove', mouseMoveHandler);
    this.chart2.canvas.addEventListener('mouseup', mouseUpHandler);

  }









  updatechart1() {
    this.chart2.update()
    this.updatechart()

    for (let i = 1; i <= this.chart2.data.datasets.length - 1; i++) {
      const dataPoint1 = this.chart2.data.datasets[i].data[1];
      const dataPoint2 = this.chart2.data.datasets[i].data[2];

      if (dataPoint1 !== null && typeof dataPoint1 !== 'number' && dataPoint2 !== null && typeof dataPoint2 !== 'number') {

        const ACSparametre = new AcsentParametres();
        ACSparametre.t0 = dataPoint1.x;
        ACSparametre.t1 = dataPoint2.x;
        ACSparametre.ap = dataPoint1.y;
        ACSparametre.beta = 20.00;

        this.ListParametresAcsent.push(ACSparametre);
      }

    }


    const dataa = {
      Objet: this.ListParametresAcsent,
      t: this.chart2.data.labels?.length
    };
    this.http.post<any>('http://localhost:5000/api/AddParametreAcsent', dataa).subscribe(e => {
      this.chart2.data.datasets[0].data = e.liste1
      this.chart2.update()
      this.f0_update(this.chart.data.datasets[0].data, this.chart2.data.datasets[0].data, this.fbparam)
      this.chart.update()
      this.chart3.update()
    })
    this.ListParametresAcsent = []
    this.chart3.update()

  }
  deleteLastParam() {

    const { data, scales: { x, y } } = this.chart2;
    console.log('suppression en cours .... ' + data.datasets.length)
    if (data.datasets.length > 2) {

      this.chart2.data.datasets.pop(); // Supprime la dernière dataset de l'array

    }
    this.updatechart1()

  }
  //**********************************************************************************************************************************/
  //**********************************************************************************************************************************/
  //******************************************************************F0 contour***********************************************++++***/
  //**********************************************************************************************************************************/
  //**********************************************************************************************************************************/
  f0_contour(x: any, wavLeng: any, phrasecontour: any, fb: any, list_seg: any, liste_words: any) {
    const canvas = document.getElementById('myChart3') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    const chartData = [];
    let m = 0;
    const labels = Array.from({ length: wavLeng }, (_, index) => index);
    let listeEntiers: number[] = list_seg.map((num: any) => Math.floor(num * 100));
    if (ctx) {
      //separation line verticale 
      const arbitraryLine = {
        id: 'arbitraryLine',
        beforeDraw(chart: any, args: any, options: any) {
          const { ctx, chartArea: { top, right, bottom, left, width, height }, scales:
            { x, y }
          } = chart;
          ctx.save()
          //how to draw a line ?
          ctx.strokeStyle = 'black';
          //console.log(liste_words)
          let i = 0
          listeEntiers.forEach((valeur) => {
            //console.log(valeur);
            ctx.strokeRect(x.getPixelForValue(valeur), top, 0, height);
            const note = liste_words[i]; 
            i++;
            ctx.textAlign = 'left';
            if (i <= liste_words.length) {
              ctx.fillText(note, x.getPixelForValue(valeur), bottom - 10);
            }
          });
          ctx.restore();
        }
      }
      if (this.chart3) {
        this.chart3.destroy();
      }
      this.chart3 = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'F0 contour',
              data: x,
              borderColor: 'blue',
              fill: false,
            }, {
              label: 'Phrase contour',
              data: phrasecontour,
              borderColor: 'yellow',
              fill: false,
              borderWidth: 1,
              tension: 0.4
            },
            {
              label: 'Fundamental Frequency',
              data: fb,
              borderColor: 'red',
              fill: false,
              borderWidth: 1,
              tension: 0.4
            },
          ]
        }
        ,
        options: {
          scales: {
            x: {

            },
            y: {
              max: 450,
              min: -100
            },
          },

        },
        plugins: [arbitraryLine]
      })
    }

  }
  f0_update(liste1: any, liste2: any, fb: any) {
    const liste3 = []
    const liste4 = []
    let p = 0.0
    let o = 0.0

    for (let i = 0; i <= liste1.length; i++) {
      let j = i
      //console.log('index',i)
      if (liste1[i] > 0 || liste1[i] < 0) {

        for (j; j <= liste1.length; j++) {
          //console.log('rentrer dans la liste  index i = ',j)
          p = p + liste1[i]
          //console.log('p actuelle : ',p)
        }
        j = i
        //console.log('valeur p apres traitement : ',p)
      }
      if (liste1[i] == 0) {
        p = 0

      }
      if (liste2[i] > 0 || liste2[i] < 0) {

        for (j; j <= liste2.length; j++) {
          o = o + liste2[i]

        }

      }
      if (liste2[i] == 0) {
        o = 0
      }


      liste3[i] = (fb + o + p)
      liste4[i] = (fb + p)
      //console.log(fb,o,p,' = ',fb+o+p)
      p = 0.0
      o = 0.0
    }
    //console.log('ici l old data : ',this.chart3.data.datasets[0].data)
    //console.log('ici la nouvelle liste : ',liste3)
    this.chart3.data.datasets[0].data = liste3
    this.chart3.data.datasets[1].data = liste4
    //console.log('ici l new data dans le graph : ',this.chart3.data.datasets[0].data)
    this.chart3.update()
    //return liste3

  }

  open(content: any) {
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }
  open1(content1: any) {
    this.modalService.open(content1, { ariaLabelledBy: 'modal-basic-title' }).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }
  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }

  }
  autoPAC() {
    let formdata = new FormData()
    formdata.append("Entry", this.addFormMarque.value.Entry);
    formdata.append("Exit", this.addFormMarque.value.Exit);
    formdata.append("Threshold", this.addFormMarque.value.Threshold);
    formdata.append("Fb", this.addFormMarque.value.Fb);
    formdata.append("Alpha", this.addFormMarque.value.Alpha);
    console.log('ici les donnees envoyer : ' + this.addFormMarque.value.Entry)
    const url = 'http://localhost:5000/api/string';
  }
  savePAC(){
    const phraseparametreNombre =this.chart.data.datasets.length-1
    const AcsentparametreNombre = this.chart2.data.datasets.length-1
    this.fileContent = "your PAC file \n\n\n\n\n\n";
    this.fileContent = this.fileContent + this.chart.data.datasets[0].data.length + "\n";
    this.fileContent = this.fileContent + phraseparametreNombre + "\n";
    this.fileContent = this.fileContent + AcsentparametreNombre + "\n";
    this.fileContent = this.fileContent + this.fbparam + "\n";
    this.fileContent = this.fileContent + "0.01" + "\n";
    this.fileContent = this.fileContent + "0.0" + "\n";
    this.fileContent = this.fileContent + "0" + "\n\n\n\n\n\n\n\n";
    for (let i = 1; i <= phraseparametreNombre; i++) {
      let x: number | undefined;
      let y: number | undefined;
      const dataPoint = this.chart.data.datasets[i].data[0];
      if (typeof dataPoint !== 'number' && dataPoint) {
        
        x = parseFloat((dataPoint.x/100).toFixed(4));
        y =  dataPoint.y;
      }
      this.fileContent = this.fileContent + x + " ";
      this.fileContent = this.fileContent + (this.chart.data.datasets[0].data.length-1)/100 + " ";
      this.fileContent = this.fileContent + y?.toFixed(4) + " 2.0000\n";
    }
    for (let i = 1; i <= AcsentparametreNombre; i++) {
      let x1: number | undefined;
      let x2: number | undefined;
      let y: number | undefined;
      const dataPoint = this.chart2.data.datasets[i].data[1];
      const dataPoint2 = this.chart2.data.datasets[i].data[2];
      if (typeof dataPoint !== 'number' && dataPoint && typeof dataPoint2!== 'number' && dataPoint2) {
        
        x1 = parseFloat((dataPoint.x/100).toFixed(4));
        x2 = parseFloat((dataPoint2.x/100).toFixed(4));
        y =  dataPoint.y;
      }
      this.fileContent = this.fileContent +x1+" "+x2+" "+ y +" 20.0000\n"
    }
    
    
   
    const blob = new Blob([this.fileContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mon_fichier.PAC';
    a.click();
    window.URL.revokeObjectURL(url);

  }
Resynthesis(){
  console.log(this.chart3.data.datasets[0].data)
  const formdata = new FormData()
  
  this.http.post<any>("http://localhost:5000/api/resynthesis", this.chart3.data.datasets[0].data).subscribe((res) => {
   
    this.downloadFile = "http://localhost:3000/"+res
    this.wavesurfer.load( "http://localhost:3000/"+res);
    this.wavesurfer.on('ready', () => {
    
      this.wavesurfer.play(); 
    });
  })
  
}
downloadit(){
  const filename = this.extractFilenameFromUrl(this.downloadFile);

  this.http.get(this.downloadFile, { responseType: 'blob' }).subscribe((audioBlob: Blob) => {
    const url = window.URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  });
}

private extractFilenameFromUrl(url: string): string {
  const parts = url.split('/');
  return parts.slice(-1)[0];  
}

}
