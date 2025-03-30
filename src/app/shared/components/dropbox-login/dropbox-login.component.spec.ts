import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropboxLoginComponent } from './dropbox-login.component';

describe('DropboxLoginComponent', () => {
  let component: DropboxLoginComponent;
  let fixture: ComponentFixture<DropboxLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropboxLoginComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropboxLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
