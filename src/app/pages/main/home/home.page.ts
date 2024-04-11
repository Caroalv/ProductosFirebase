import { Component, inject, OnInit } from '@angular/core';
import { User } from 'firebase/auth';
import { Product } from 'src/app/Models/product.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateProductComponent } from 'src/app/shared/components/add-update-product/add-update-product.component';
import { orderBy } from 'firebase/firestore';
import * as pdfMake from 'pdfmake/build/pdfmake'; // Importa pdfmake
import * as pdfFonts from 'pdfmake/build/vfs_fonts'; // Importa vfs_fonts
(pdfMake as any).vfs = pdfFonts.pdfMake.vfs; // Configura vfs para pdfmake
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';


@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  productsCollection: AngularFirestoreCollection<Product>; // Declaración de la variable
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService)


products: Product[] = [];
loading: boolean = false;

constructor(private firestore: AngularFirestore) {}

  ngOnInit() {
    this.productsCollection = this.firestore.collection<Product>('users/{uid}/products');

  }
  
  loadData(event: any) {
    setTimeout(() => {
      let lastProduct = this.products[this.products.length - 1];
      if (!lastProduct) {
        // No hay productos cargados aún, no podemos cargar más
        event.target.disabled = true;
        event.target.complete();
        return;
      }
  
      let query = this.productsCollection.ref
        .orderBy('soldUnits', 'desc')
        .startAfter(lastProduct)
        .limit(10); // Ajusta el número de productos a cargar
  
      query.get().then((querySnapshot) => {
        if (!querySnapshot.empty) {
          let newProducts = querySnapshot.docs.map(doc => doc.data() as Product);
          this.products = this.products.concat(newProducts);
          this.loading = false;
        } else {
          // No hay más productos para cargar, desactivamos el infinite scroll
          event.target.disabled = true;
        }
  
        event.target.complete();
      }).catch((error) => {
        console.error('Error al cargar más datos:', error);
        event.target.complete();
      });
    }, 1000);
  }
  

  generatePDF() {
  let docDefinition: TDocumentDefinitions = {
    content: [
      {
        text: 'Productos',
        style: 'header'
      },
      {
        table: {
          headerRows: 1,
          widths: [20, '*', 'auto', 'auto'],
          body: [
            [{ text: 'N', style: 'tableHeader' }, 'Nombre', 'Precio', 'Unidades Vendidas'],
            ...this.products.map((product, index) => [index + 1, product.name, product.price.toString(), product.soldUnits.toString()])
          ]
        }
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      tableHeader: {
        bold: true,
        fontSize: 13,
        color: 'black'
      }
    }
  };

  // Utiliza pdfMake para generar el PDF
  let pdfDoc = pdfMake.createPdf(docDefinition);

  // Descarga el PDF en lugar de abrirlo en una nueva pestaña
  pdfDoc.download('productos.pdf');
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
