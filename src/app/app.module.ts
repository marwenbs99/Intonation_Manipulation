import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { WaveformComponent } from './waveform/waveform.component';
import { HttpClientModule } from '@angular/common/http' ;
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { __decorate } from "tslib";
import { HomeComponent } from './home/home.component';


@NgModule({
  
  declarations: [
    
    AppComponent,
    WaveformComponent,
    HomeComponent,
    
   
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    NgbModule,
    ReactiveFormsModule
 
    
    
 
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
