import { Routes, RouterModule } from "@angular/router"
import { AuthPage } from "./auth.page"
import { NgModule } from "@angular/core"
import { LoginPage } from "./login/login.page"
import { DropboxLoginComponent } from "./dropbox-login/dropbox-login.component"

const routes: Routes = [
    {
        path: '',
        redirectTo: '/auth/login',
        pathMatch: "full"
    },
    {
        path: "",
        component: AuthPage,
        children: [
            {
                path: 'login',
                component: LoginPage
            },
            {
                path: 'dropbox-login',
                component: DropboxLoginComponent
            },
            {
                path: 'callback',
                component: DropboxLoginComponent,
                // This route is for handling the OAuth callback
            }
        ]
    }
]

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})

export class AuthRoutingModule {}