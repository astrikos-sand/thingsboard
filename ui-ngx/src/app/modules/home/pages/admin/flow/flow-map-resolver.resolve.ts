import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { FlowService } from '@app/core/services/flow.service';

@Injectable({ providedIn: 'root' })
export class FlowDetailsResolver implements Resolve<any> {
  constructor(private flowService: FlowService) {}

  resolve(route: ActivatedRouteSnapshot) {
    const flowId = route.params['flowId'];
    return this.flowService.fetchFlowDetails(flowId);
  }
}
