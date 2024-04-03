import { Component, OnInit } from '@angular/core';
import { UtilsService } from 'src/app/services/utils.service';
import { FirebaseService } from 'src/app/services/firebase.service';
import { User } from 'src/app/models/user.model';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {

  constructor(private firebaseSvc: FirebaseService, private utilsSvc: UtilsService) {}

  ngOnInit() {}

  user(): User {
    return this.utilsSvc.getFromLocalStorage('user');
  }

  //================ Tomar/seleccionar Imagen =====================
  async takeImage() {
    let user = this.user();
    let path = `users/${user.uid}`;
    let loading; // Declarar la variable loading aquí

    try {
      const dataUrl = (await this.utilsSvc.takePicture('Imagen del perfil')).dataUrl;
      
      loading = await this.utilsSvc.loading(); // Inicializar la variable loading
      await loading.present();
      
      const imagePath = `${user.uid}/profile`;
      user.image = await this.firebaseSvc.uploadImage(imagePath, dataUrl);

      await this.firebaseSvc.updateDocument(path, { image: user.image });

      this.utilsSvc.saveInLocalStorage('user', user);

      this.utilsSvc.presentToast({
        message: 'Imagen actualizada exitosamente',
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      });
    } catch (error) {
      console.log("error", error);

      this.utilsSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline'
      });
    } finally {
      if (loading) {
        loading.dismiss(); 
      }
    }
  }
}
