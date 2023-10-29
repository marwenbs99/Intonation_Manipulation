import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalCommunicationService {
  private showModalSource = new Subject<boolean>();
  showModal$ = this.showModalSource.asObservable();

  constructor() { }

  ouvrirModal() {
    this.showModalSource.next(true);
  }

  fermerModal() {
    this.showModalSource.next(false);
  }
}
