import { Component, Input } from '@angular/core';
import { CrudService } from '../../services/crud.service';

@Component({
  selector: 'app-landing-content',
  templateUrl: './landing-content.component.html',
  styleUrls: ['./landing-content.component.scss'],
})
export class LandingContentComponent {
  @Input() titleShow: boolean = false;
}
