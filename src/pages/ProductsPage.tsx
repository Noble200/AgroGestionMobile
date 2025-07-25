import React from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonIcon,
  IonButton
} from '@ionic/react';
import { cube, construct } from 'ionicons/icons';

export const ProductsPage: React.FC = () => {
  return (
    <IonPage className="agrogestion-page">
      <IonHeader className="agrogestion-header">
        <IonToolbar>
          <IonTitle>Productos</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="empty-state">
          <IonIcon icon={cube} />
          <h3>Gestión de Productos</h3>
          <p>Esta sección está en desarrollo y pronto estará disponible para gestionar tu inventario de productos agrícolas.</p>
          <IonButton className="agro-button">
            <IonIcon icon={construct} slot="start" />
            Próximamente
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ProductsPage;