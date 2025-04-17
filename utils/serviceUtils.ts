import { Service } from '@/types';

export function isServiceDuplicate(existingServices: Service[], newService: Service): boolean {
  return existingServices.some((item) =>
    item.name.toLowerCase() === newService.name.toLowerCase() &&
    item.otp.issuer.toLowerCase() === newService.otp.issuer.toLowerCase() &&
    item.secret === newService.secret
  );
}
