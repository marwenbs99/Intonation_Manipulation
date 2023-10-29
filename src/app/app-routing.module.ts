import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WaveformComponent } from './waveform/waveform.component';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  {path:'waveform',component:WaveformComponent},
  {path:'',component:HomeComponent}
   
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
