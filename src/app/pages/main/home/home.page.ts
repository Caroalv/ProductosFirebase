import { Component, inject, OnInit } from '@angular/core';
import { User } from 'firebase/auth';
import { Product } from 'src/app/Models/product.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateProductComponent } from 'src/app/shared/components/add-update-product/add-update-product.component';
import { orderBy } from 'firebase/firestore';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService)


products: Product[] = [];
loading: boolean = false;
  ngOnInit() {
  }

  //============= Cerrar Sesion ==========

  signOut(){
    this.firebaseSvc.signOut();
  }


  user(): User{
    return this.utilsSvc.getFromLocalStorage('user');
  }
  
  ionViewWillEnter() {
    this.getProducts();
  }


doRefresh(event) {
  setTimeout(() => {
    this.getProducts();
    event.target.complete();
  }, 1000);
}

//=============== Obtener Ganancias ====================
  getProfits(){
    return this.products.reduce((index,product)=> index + product.price * product.soldUnits, 0);
  }


  //================== Obtener Productos=====================
  getProducts(){
    let path =`users/${this.user().uid}/products`;

    this.loading = true;

    let query = (
      orderBy('soldUnits', 'desc')
    )

    let sub = this.firebaseSvc.getCollectionData(path, query).subscribe({
      next: (res: any) => {
        console.log(res);
        this.products = res;

        this.loading = false;
        
        sub.unsubscribe();
      }
    })

  }

  //============= Agregar o Actualizar producto====================

  async addUpdateProduct(product?: Product){

  let success = await this.utilsSvc.presentModal({
    component: AddUpdateProductComponent,
    cssClass: 'add-update-modal',
    componentProps: {product}
  })

  if(success) this.getProducts();
}


async confirmDeleteProduct(product: Product) {
this.utilsSvc.presentAlert({
    header: 'Eliminar Producto',
    message: '¿Estas seguro de quere eliminar este producto?',
    mode: 'ios',
    buttons: [
      {
        text: 'Cancelar',
      }, {
        text: 'Sí, eliminar',
        handler: () => {
          this.deleteProduct(product)
        }
      }
    ]
  });

}

//==================== Eliminar Producto ======================
async deleteProduct(product: Product) {

  let path =`users/${this.user().uid}/products/${product.id}`

  const loading = await this.utilsSvc.loading();
  await loading.present();

  let imagePath = await this.firebaseSvc.getFilePath(product.image);
  await this.firebaseSvc.deleteFile(imagePath);

  this.firebaseSvc.deleteDocument(path).then(async res => {

    this.products = this.products.filter(p => p.id !== product.id);

    this.utilsSvc.presentToast({
      message: 'Producto eliminado exitosamente',
      duration: 1500,
      color: 'success',
      position: 'middle',
      icon: 'checkmark-circle-outline'
    })




  }).catch(error=>{
    console.log("error");

    this.utilsSvc.presentToast({
      message: error.message,
      duration: 2500,
      color: 'primary',
      position: 'middle',
      icon: 'alert-circle-outline'
    })

  }).finally(()=> {
    loading.dismiss();
  })

}

}