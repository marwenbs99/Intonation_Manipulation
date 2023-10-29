import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})

export class HomeComponent {
  faqItems = [
    {
      question: 'Was ist ein PAC-datei ?',
      answer: 'Eine PAC-Datei ist eine Abkürzung für Parameter-Access-Control-Datei. Es handelt sich um eine Datei, die bestimmte Einstellungen und Konfigurationen enthält.'
    },
    {
      question: 'Wie sieht das Format einer PAC-Datei aus?',
      answer: 'Um den Inhalt und das Format einer PAC-Datei besser zu verstehen, empfehlen wir Ihnen, Ihre Sounds hochzuladen und Auto-Pac durchzuführen. Sobald Sie sich auf der Manipulationsplattform befinden, können Sie die automatisch generierte Pac-Datei herunterladen und ihren Inhalt sehen.'
    },
    {
      question: 'Was ist Fujisaki model ?',
      answer: 'Das Fujisaki-Modell zerlegt die Sprachproduktion in mathematische Komponenten wie Oszillatoren und Filter, um darzustellen, wie die menschliche Stimme erzeugt und verändert wird, um verschiedene Intonationen zu erstellen. Mit Hilfe dieses Modells können Forscher Intonationsmuster der Stimme analysieren und synthetisieren.'
    }
    // Ajoutez plus d'éléments FAQ au besoin
  ];
  path : any
  files : any
  wavesurfer:any
  constructor(private router: Router){

  }
  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      const file: File = event.target.files[0];
      const filePath: string = URL.createObjectURL(file);
      console.log("ici "+file)
      this.path = filePath;
      this.files = file;
      const data = { path: filePath, files: file };
      this.router.navigate(['/waveform'], { state: { myData: data } });
    }}
}
