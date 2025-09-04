import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-title',
  templateUrl: './pagetitle.component.html',
  styleUrls: ['./pagetitle.component.scss'],
  standalone:true,
  imports:[CommonModule]
})
export class PageTitleComponent {

  @Input() breadcrumbItems: any[];
  @Input() title: string;

  constructor() { }

}
