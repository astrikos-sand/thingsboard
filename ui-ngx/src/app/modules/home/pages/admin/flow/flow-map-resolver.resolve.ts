import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { FlowService } from '@app/core/services/flow.service';

@Injectable({ providedIn: 'root' })
export class FlowDetailsResolver implements Resolve<any> {
  constructor(private flowService: FlowService) { }

  resolve(route: ActivatedRouteSnapshot) {
    const flowId = route.params['flowId'];
    console.log(flowId)
    return this.flowService.fetchFlowDetails(flowId);
  }
}


@Injectable({ providedIn: 'root' })
export class NodeFieldsResolver implements Resolve<any> {
  constructor(private flowService: FlowService) { }

  resolve(route: ActivatedRouteSnapshot) {
    return this.flowService.getNodeFields();
  }
}
