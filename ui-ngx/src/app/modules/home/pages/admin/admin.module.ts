///
/// Copyright © 2016-2024 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { SharedModule } from '@app/shared/shared.module';
import { MailServerComponent } from '@modules/home/pages/admin/mail-server.component';
import { GeneralSettingsComponent } from '@modules/home/pages/admin/general-settings.component';
import { SecuritySettingsComponent } from '@modules/home/pages/admin/security-settings.component';
import { HomeComponentsModule } from '@modules/home/components/home-components.module';
import { OAuth2SettingsComponent } from '@modules/home/pages/admin/oauth2-settings.component';
import { SmsProviderComponent } from '@home/pages/admin/sms-provider.component';
import { SendTestSmsDialogComponent } from '@home/pages/admin/send-test-sms-dialog.component';
import { HomeSettingsComponent } from '@home/pages/admin/home-settings.component';
import { ResourcesLibraryComponent } from '@home/pages/admin/resource/resources-library.component';
import { ResourcesTableHeaderComponent } from '@home/pages/admin/resource/resources-table-header.component';
import { QueueComponent } from '@home/pages/admin/queue/queue.component';
import { RepositoryAdminSettingsComponent } from '@home/pages/admin/repository-admin-settings.component';
import { AutoCommitAdminSettingsComponent } from '@home/pages/admin/auto-commit-admin-settings.component';
import { TwoFactorAuthSettingsComponent } from '@home/pages/admin/two-factor-auth-settings.component';
import { FlowMapComponent } from '@home/pages/admin/flow/flow-map.component';
import { ReactFlowWrapper } from '@home/pages/admin/flow/reactflow-wrapper';
import { FlowListComponent } from '@home/pages/admin/flow/flow-list.component';
import { KpiListComponent } from '@home/pages/admin/kpi/kpi-list.component';
import { ArchivesComponent } from './archives/archives.component';
import { RepositoryComponent } from './repository/repository.component';
import { FunctionListComponent } from './functions/function-list.component';
import { WebhookComponent } from './webhook/webhook.component';
import { PeriodicTriggerComponent } from './periodic-trigger/periodic-trigger.component';
import { EnvComponent } from './env/env.component';
import { MarkdownModule } from 'ngx-markdown';
import { MatSidenavModule } from '@angular/material/sidenav';

@NgModule({
  declarations:
    [
      GeneralSettingsComponent,
      MailServerComponent,
      SmsProviderComponent,
      SendTestSmsDialogComponent,
      SecuritySettingsComponent,
      OAuth2SettingsComponent,
      HomeSettingsComponent,
      ResourcesLibraryComponent,
      ResourcesTableHeaderComponent,
      QueueComponent,
      RepositoryAdminSettingsComponent,
      AutoCommitAdminSettingsComponent,
      TwoFactorAuthSettingsComponent,
      FlowMapComponent,
      FlowListComponent,
      KpiListComponent,
      ArchivesComponent,
      RepositoryComponent,
      EnvComponent,
      FunctionListComponent,
      WebhookComponent,
      PeriodicTriggerComponent,
    ],
  imports: [
    CommonModule,
    SharedModule,
    HomeComponentsModule,
    AdminRoutingModule,
    ReactFlowWrapper,
    MarkdownModule.forRoot(),
    MatSidenavModule,
  ]
})
export class AdminModule { }
