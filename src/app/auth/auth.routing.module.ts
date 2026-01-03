import { Routes, RouterModule } from "@angular/router"
import { AuthPage } from "./auth.page"
import { NgModule } from "@angular/core"
import { LoginPage } from "./login/login.page"

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
            }
        ]
    }
]

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})

export class AuthRoutingModule {}