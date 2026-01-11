import { TestBed } from '@angular/core/testing';

import { Imagen } from './imagen';

describe('Imagen', () => {
  let service: Imagen;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Imagen);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
