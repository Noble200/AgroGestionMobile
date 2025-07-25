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
import { swapHorizontal, construct } from 'ionicons/icons';

export const TransfersPage: React.FC = () => {
  return (
    <IonPage className="agrogestion-page">
      <IonHeader className="agrogestion-header">
        <IonToolbar>
          <IonTitle>Transferencias</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="empty-state">
          <IonIcon icon={swapHorizontal} />
          <h3>Transferencias</h3>
          <p>Gestiona las transferencias de productos entre almacenes de manera eficiente.</p>
          <IonButton className="agro-button">
            <IonIcon icon={construct} slot="start" />
            Próximamente
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default TransfersPage;