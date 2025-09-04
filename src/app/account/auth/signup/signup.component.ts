import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { AuthenticationService } from '../../../core/services/auth.service';
import { UserProfileService } from '../../../core/services/user.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
  standalone:true,
  imports:[CommonModule,FormsModule,ReactiveFormsModule,RouterModule]
})
export class SignupComponent implements OnInit {

  signupForm: UntypedFormGroup;
  submitted: any = false;
  error: any = 'fdsfsdfdsf';
  successmsg: any = false;

  // set the currenr year
  year: number = new Date().getFullYear();

  // tslint:disable-next-line: max-line-length
  constructor(private readonly formBuilder: FormBuilder, private readonly route: ActivatedRoute, private readonly router: Router, private readonly authenticationService: AuthenticationService,
    private readonly userService: UserProfileService) { }

  ngOnInit() {
    this.signupForm = this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  // convenience getter for easy access to form fields
  get f() { return this.signupForm.controls; }

  /**
   * On submit form
   */
  onSubmit() {
    this.submitted = true;

    // stop here if form is invalid

    const email = this.f['email'].value;
    const name = this.f['username'].value;
    const password = this.f['password'].value;

    // Use AuthenticationService to register
    this.authenticationService.register({ email, username: name, password }).subscribe({
      next: (res) => {
        this.successmsg = true;
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.error = err || 'Registration failed';
      }
    });
  }
}
