import { PartialTOTPFile, Service, TokenType, TOTPAlgorithm } from "@/types";
import { generateTOTPUrl } from "@/utils";
import * as Crypto from 'expo-crypto';

interface twofas {
  services: twofaService[]
  appVersionCode: number
  schemaVersion: number
  groups: Group[]
  appOrigin: string
  appVersionName: string
}

interface twofaService {
  order: Order
  updatedAt: number
  name: string
  serviceTypeID?: string
  badge?: Badge
  icon: Icon
  otp: Otp
  secret: string
  groupId?: string
}

interface Order {
  position: number
}

interface Badge {
  color: string
}
interface Icon {
  selected: string
  iconCollection: IconCollection
  label: Label
}

interface IconCollection {
  id: string
}
interface Label {
  text: string
  backgroundColor: string
}

interface Otp {
  link?: string
  algorithm: string
  period: number
  account?: string
  source: string
  counter: number
  tokenType: string
  issuer?: string
  digits: number
}

interface Group {
  isExpanded: boolean
  id: string
  name: string
}

export default async function parse2fas(existingServices: Service[], jsonString: string) {
  const data = JSON.parse(jsonString) as twofas;

  const fileData: PartialTOTPFile = {
    services: [],
    groups: [],
  };

  for (const item of data.services) {
    const tempService: Service = {
      icon: {
        label: item.name.substring(0, 2).toUpperCase(),
      },
      name: item.name,
      otp: {
        algorithm: item.otp.algorithm as TOTPAlgorithm,
        digits: item.otp.digits,
        issuer: item.otp.issuer ?? "Not Set",
        link: item.otp.link ?? "temp",
        period: item.otp.period,
        tokenType: item.otp.tokenType.toUpperCase() as TokenType 
      },
      position: existingServices.length + fileData.services.length,
      secret: item.secret,
      uid: Crypto.randomUUID(),
      updatedAt: Date.now()
    }
    if (!item.otp.link)
      tempService.otp.link = generateTOTPUrl(tempService.otp.tokenType, tempService.name, tempService.secret, tempService.otp.digits, tempService.otp.period ?? 30, tempService.otp.algorithm, tempService.otp.issuer)
    fileData.services.push(tempService)
  }

  for (const group of data.groups) {
    // TODO: Implement adding groups
  }
}