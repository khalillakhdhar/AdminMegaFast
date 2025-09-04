import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone:true,
  imports:[CommonModule,FormsModule,ReactiveFormsModule,RouterModule]
})

/**
 * Login component
 */
export class LoginComponent implements OnInit {

  loginForm: UntypedFormGroup;
  submitted: any = false;
  error: any = '';
  returnUrl: string;
  fieldTextType!: boolean;

  // set the currenr year
  year: number = new Date().getFullYear();

  // tslint:disable-next-line: max-line-length
  constructor(private readonly formBuilder: FormBuilder, private readonly route: ActivatedRoute, private readonly router: Router, private readonly authenticationService: AuthenticationService) {
    this.returnUrl = '/';
  }

  ngOnInit() {
    if (localStorage.getItem('currentUser')) {
      this.router.navigate(['/']);
    }
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.returnUrl;
    // form validation
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  // convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  /**
   * Form submit
   */
  onSubmit() {
    this.submitted = true;

    const email = this.f['email'].value; // Get the username from the form
    const password = this.f['password'].value; // Get the password from the form

    // Login via AuthenticationService (Firebase)
    this.authenticationService.login(email, password).subscribe({
      next: (user: any) => {
        if (user) {
          localStorage.setItem('currentUser', JSON.stringify(user));

          // Redirect based on user role
          const userRole = localStorage.getItem('userRole');
          let redirectUrl: string;

          if (userRole === 'client') {
            redirectUrl = '/client';
          } else if (userRole === 'driver') {
            redirectUrl = '/driver'; // You can implement driver portal later
          } else {
            redirectUrl = '/megafast'; // Default admin
          }

          this.router.navigateByUrl(redirectUrl);
        }
      },
      error: (err) => {
        this.error = err || 'Login failed';
      }
    });
  }

  /**
 * Password Hide/Show
 */
  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }
}
