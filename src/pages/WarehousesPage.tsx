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
import { business, construct } from 'ionicons/icons';

export const WarehousesPage: React.FC = () => {
  return (
    <IonPage className="agrogestion-page">
      <IonHeader className="agrogestion-header">
        <IonToolbar>
          <IonTitle>Almacenes</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="empty-state">
          <IonIcon icon={business} />
          <h3>Almacenes</h3>
          <p>Gestiona la información y el inventario de todos tus almacenes y depósitos.</p>
          <IonButton className="agro-button">
            <IonIcon icon={construct} slot="start" />
            Próximamente
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};
export default WarehousesPage;