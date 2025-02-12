import { Component } from '@angular/core';
import { CrudService } from 'src/app/shared/services/crud.service';
import { AuthService } from 'src/app/shared/services/firebase.auth.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
})
export class UsersPage {
  isNewUser = false;
  email: string = '';
  password: string = '';
  loader = false;
  users: any[] = [];
  constructor(private auth: AuthService, private crudService: CrudService) {}

  ngOnInit(): void {
    this.loader = true;
    this.crudService.getDocuments('users').subscribe((users) => {
      this.users = users;
      this.loader = false;
      this.isNewUser = false;
    });
    this.auth.signOut();
  }

  createUser() {
    this.auth.createUser(this.email, this.password).subscribe((user) => {
      this.crudService.addDocument('users', {
        email: user.user.email,
        uid: user.user.uid,
        createdAt: new Date(),
      });
    });
  }

  cancel() {
    this.isNewUser = false;
    this.email = '';
    this.password = '';
  }

  deleteUser(id: string) {
    this.loader = true
    this.auth.deleteUser().subscribe(() => {});
    this.crudService.deleteDocument('users', id).then(() => {
      this.crudService.getDocuments('users').subscribe((users) => {
        this.users = users;
        this.loader = false;
      });
    });
  }
}
