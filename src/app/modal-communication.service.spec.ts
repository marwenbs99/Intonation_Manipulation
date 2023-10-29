import { TestBed } from '@angular/core/testing';

import { ModalCommunicationService } from './modal-communication.service';

describe('ModalCommunicationService', () => {
  let service: ModalCommunicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModalCommunicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
