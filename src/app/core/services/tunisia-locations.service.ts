import { Injectable } from '@angular/core';

export interface TunisianGovernorate {
  code: string;
  name: string;
  arabicName: string;
  delegations: TunisianDelegation[];
}

export interface TunisianDelegation {
  code: string;
  name: string;
  arabicName: string;
  postalCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TunisiaLocationsService {

  private readonly governorates: TunisianGovernorate[] = [
    {
      code: 'TN-11',
      name: 'Tunis',
      arabicName: 'تونس',
      delegations: [
        { code: 'TN-11-01', name: 'Tunis Médina', arabicName: 'تونس المدينة', postalCode: '1001' },
        { code: 'TN-11-02', name: 'Bab Bhar', arabicName: 'باب بحر', postalCode: '1001' },
        { code: 'TN-11-03', name: 'Bab Souika', arabicName: 'باب سويقة', postalCode: '1006' },
        { code: 'TN-11-04', name: 'Cité El Khadra', arabicName: 'مدينة الخضراء', postalCode: '1003' },
        { code: 'TN-11-05', name: 'Djebel Jelloud', arabicName: 'جبل جلود', postalCode: '1082' },
        { code: 'TN-11-06', name: 'El Kabaria', arabicName: 'القبارية', postalCode: '1003' },
        { code: 'TN-11-07', name: 'El Menzah', arabicName: 'المنزه', postalCode: '1004' },
        { code: 'TN-11-08', name: 'El Omrane', arabicName: 'العمران', postalCode: '1005' },
        { code: 'TN-11-09', name: 'El Omrane Supérieur', arabicName: 'العمران الأعلى', postalCode: '1005' },
        { code: 'TN-11-10', name: 'Ettahrir', arabicName: 'التحرير', postalCode: '1002' },
        { code: 'TN-11-11', name: 'Ezzouhour', arabicName: 'الزهور', postalCode: '1008' },
        { code: 'TN-11-12', name: 'Hraïria', arabicName: 'الهرايرية', postalCode: '1124' },
        { code: 'TN-11-13', name: 'Sidi Bou Said', arabicName: 'سيدي بوسعيد', postalCode: '2026' },
        { code: 'TN-11-14', name: 'Sidi El Béchir', arabicName: 'سيدي البشير', postalCode: '1002' },
        { code: 'TN-11-15', name: 'La Marsa', arabicName: 'المرسى', postalCode: '2078' },
        { code: 'TN-11-16', name: 'Le Kram', arabicName: 'الكرم', postalCode: '2015' },
        { code: 'TN-11-17', name: 'Carthage', arabicName: 'قرطاج', postalCode: '2016' }
      ]
    },
    {
      code: 'TN-12',
      name: 'Ariana',
      arabicName: 'أريانة',
      delegations: [
        { code: 'TN-12-01', name: 'Ariana Ville', arabicName: 'أريانة المدينة', postalCode: '2080' },
        { code: 'TN-12-02', name: 'La Soukra', arabicName: 'السكرة', postalCode: '1004' },
        { code: 'TN-12-03', name: 'Raoued', arabicName: 'رواد', postalCode: '1144' },
        { code: 'TN-12-04', name: 'Kalâat el-Andalous', arabicName: 'قلعة الأندلس', postalCode: '1131' },
        { code: 'TN-12-05', name: 'Sidi Thabet', arabicName: 'سيدي ثابت', postalCode: '1185' },
        { code: 'TN-12-06', name: 'Ettadhamen-Mnihla', arabicName: 'التضامن-المنيهلة', postalCode: '1142' }
      ]
    },
    {
      code: 'TN-13',
      name: 'Ben Arous',
      arabicName: 'بن عروس',
      delegations: [
        { code: 'TN-13-01', name: 'Ben Arous', arabicName: 'بن عروس', postalCode: '2013' },
        { code: 'TN-13-02', name: 'El Mourouj', arabicName: 'المروج', postalCode: '2074' },
        { code: 'TN-13-03', name: 'Hammam Lif', arabicName: 'حمام الأنف', postalCode: '2050' },
        { code: 'TN-13-04', name: 'Hammam Chott', arabicName: 'حمام الشط', postalCode: '1153' },
        { code: 'TN-13-05', name: 'Bou Mhel el-Bassatine', arabicName: 'بومهل البساتين', postalCode: '2097' },
        { code: 'TN-13-06', name: 'Ezzahra', arabicName: 'الزهراء', postalCode: '2034' },
        { code: 'TN-13-07', name: 'Radès', arabicName: 'رادس', postalCode: '2040' },
        { code: 'TN-13-08', name: 'Fouchana', arabicName: 'فوشانة', postalCode: '2023' },
        { code: 'TN-13-09', name: 'Mohamedia-Fouchana', arabicName: 'المحمدية-فوشانة', postalCode: '1167' },
        { code: 'TN-13-10', name: 'Mégrine', arabicName: 'المقرين', postalCode: '2014' },
        { code: 'TN-13-11', name: 'Nouvelle Medina', arabicName: 'المدينة الجديدة', postalCode: '1110' }
      ]
    },
    {
      code: 'TN-14',
      name: 'Manouba',
      arabicName: 'منوبة',
      delegations: [
        { code: 'TN-14-01', name: 'Manouba', arabicName: 'منوبة', postalCode: '2010' },
        { code: 'TN-14-02', name: 'Den Den', arabicName: 'دندن', postalCode: '1156' },
        { code: 'TN-14-03', name: 'Douar Hicher', arabicName: 'دوار هيشر', postalCode: '1172' },
        { code: 'TN-14-04', name: 'Mornaguia', arabicName: 'المرناقية', postalCode: '1136' },
        { code: 'TN-14-05', name: 'Oued Ellil', arabicName: 'وادي الليل', postalCode: '1125' },
        { code: 'TN-14-06', name: 'Tebourba', arabicName: 'تبربة', postalCode: '1041' },
        { code: 'TN-14-07', name: 'Jedaida', arabicName: 'الجديدة', postalCode: '1114' },
        { code: 'TN-14-08', name: 'Borj El Amri', arabicName: 'برج العامري', postalCode: '1151' }
      ]
    },
    {
      code: 'TN-21',
      name: 'Nabeul',
      arabicName: 'نابل',
      delegations: [
        { code: 'TN-21-01', name: 'Nabeul', arabicName: 'نابل', postalCode: '8000' },
        { code: 'TN-21-02', name: 'Dar Chaabane El Fehri', arabicName: 'دار شعبان الفهري', postalCode: '8027' },
        { code: 'TN-21-03', name: 'Béni Khalled', arabicName: 'بني خلاد', postalCode: '8005' },
        { code: 'TN-21-04', name: 'El Haouaria', arabicName: 'الهوارية', postalCode: '8045' },
        { code: 'TN-21-05', name: 'Takelsa', arabicName: 'تاكلسة', postalCode: '8027' },
        { code: 'TN-21-06', name: 'Soliman', arabicName: 'سليمان', postalCode: '8020' },
        { code: 'TN-21-07', name: 'Menzel Temime', arabicName: 'منزل تميم', postalCode: '8080' },
        { code: 'TN-21-08', name: 'Korba', arabicName: 'قربة', postalCode: '8070' },
        { code: 'TN-21-09', name: 'Kelibia', arabicName: 'قليبية', postalCode: '8090' },
        { code: 'TN-21-10', name: 'Hammam Ghezèze', arabicName: 'حمام الغزاز', postalCode: '8065' },
        { code: 'TN-21-11', name: 'Hammamet', arabicName: 'الحمامات', postalCode: '8050' },
        { code: 'TN-21-12', name: 'Grombalia', arabicName: 'قرمبالية', postalCode: '8030' },
        { code: 'TN-21-13', name: 'Bouargoub', arabicName: 'بوعرقوب', postalCode: '8017' },
        { code: 'TN-21-14', name: 'El Mida', arabicName: 'الميدة', postalCode: '8077' },
        { code: 'TN-21-15', name: 'Zaouiet Djedidi', arabicName: 'زاوية الجديدي', postalCode: '8028' },
        { code: 'TN-21-16', name: 'Béni Khiar', arabicName: 'بني خيار', postalCode: '8021' }
      ]
    },
    {
      code: 'TN-22',
      name: 'Zaghouan',
      arabicName: 'زغوان',
      delegations: [
        { code: 'TN-22-01', name: 'Zaghouan', arabicName: 'زغوان', postalCode: '1100' },
        { code: 'TN-22-02', name: 'Zriba', arabicName: 'الزريبة', postalCode: '1111' },
        { code: 'TN-22-03', name: 'Birr M\'Cherga', arabicName: 'بير مشارقة', postalCode: '1155' },
        { code: 'TN-22-04', name: 'Djebel Oust', arabicName: 'جبل الوسط', postalCode: '1163' },
        { code: 'TN-22-05', name: 'El Fahs', arabicName: 'الفحص', postalCode: '1134' },
        { code: 'TN-22-06', name: 'Nadhour', arabicName: 'الناظور', postalCode: '1176' }
      ]
    },
    {
      code: 'TN-23',
      name: 'Bizerte',
      arabicName: 'بنزرت',
      delegations: [
        { code: 'TN-23-01', name: 'Bizerte Nord', arabicName: 'بنزرت الشمالية', postalCode: '7000' },
        { code: 'TN-23-02', name: 'Bizerte Sud', arabicName: 'بنزرت الجنوبية', postalCode: '7000' },
        { code: 'TN-23-03', name: 'Sejnane', arabicName: 'سجنان', postalCode: '7014' },
        { code: 'TN-23-04', name: 'Joumine', arabicName: 'جومين', postalCode: '7018' },
        { code: 'TN-23-05', name: 'Mateur', arabicName: 'ماطر', postalCode: '7030' },
        { code: 'TN-23-06', name: 'Ghezala', arabicName: 'غزالة', postalCode: '7038' },
        { code: 'TN-23-07', name: 'Menzel Bourguiba', arabicName: 'منزل بورقيبة', postalCode: '7050' },
        { code: 'TN-23-08', name: 'Tinja', arabicName: 'تينجة', postalCode: '7080' },
        { code: 'TN-23-09', name: 'Utique', arabicName: 'أوتيك', postalCode: '7040' },
        { code: 'TN-23-10', name: 'Ghar El Melh', arabicName: 'غار الملح', postalCode: '7045' },
        { code: 'TN-23-11', name: 'Ras Jebel', arabicName: 'راس الجبل', postalCode: '7070' },
        { code: 'TN-23-12', name: 'Menzel Jemil', arabicName: 'منزل جميل', postalCode: '7035' },
        { code: 'TN-23-13', name: 'El Alia', arabicName: 'العالية', postalCode: '7012' }
      ]
    },
    {
      code: 'TN-31',
      name: 'Béja',
      arabicName: 'باجة',
      delegations: [
        { code: 'TN-31-01', name: 'Béja Nord', arabicName: 'باجة الشمالية', postalCode: '9000' },
        { code: 'TN-31-02', name: 'Béja Sud', arabicName: 'باجة الجنوبية', postalCode: '9000' },
        { code: 'TN-31-03', name: 'Amdoun', arabicName: 'عمدون', postalCode: '9030' },
        { code: 'TN-31-04', name: 'Nefza', arabicName: 'نفزة', postalCode: '9015' },
        { code: 'TN-31-05', name: 'Téboursouk', arabicName: 'تبرسق', postalCode: '9040' },
        { code: 'TN-31-06', name: 'Testour', arabicName: 'تستور', postalCode: '9070' },
        { code: 'TN-31-07', name: 'Goubellat', arabicName: 'قبلاط', postalCode: '9070' },
        { code: 'TN-31-08', name: 'Medjez el-Bab', arabicName: 'مجاز الباب', postalCode: '9060' },
        { code: 'TN-31-09', name: 'Thibar', arabicName: 'تيبار', postalCode: '9041' }
      ]
    },
    {
      code: 'TN-32',
      name: 'Jendouba',
      arabicName: 'جندوبة',
      delegations: [
        { code: 'TN-32-01', name: 'Jendouba', arabicName: 'جندوبة', postalCode: '8100' },
        { code: 'TN-32-02', name: 'Jendouba Nord', arabicName: 'جندوبة الشمالية', postalCode: '8160' },
        { code: 'TN-32-03', name: 'Bou Salem', arabicName: 'بوسالم', postalCode: '8170' },
        { code: 'TN-32-04', name: 'Tabarka', arabicName: 'طبرقة', postalCode: '8110' },
        { code: 'TN-32-05', name: 'Aïn Draham', arabicName: 'عين دراهم', postalCode: '8160' },
        { code: 'TN-32-06', name: 'Fernana', arabicName: 'فرنانة', postalCode: '8180' },
        { code: 'TN-32-07', name: 'Ghardimaou', arabicName: 'غار الدماء', postalCode: '8140' },
        { code: 'TN-32-08', name: 'Oued Meliz', arabicName: 'وادي مليز', postalCode: '8142' },
        { code: 'TN-32-09', name: 'Balta-Bou Aouane', arabicName: 'بلطة بوعوان', postalCode: '8114' }
      ]
    },
    {
      code: 'TN-33',
      name: 'Le Kef',
      arabicName: 'الكاف',
      delegations: [
        { code: 'TN-33-01', name: 'Le Kef', arabicName: 'الكاف', postalCode: '7100' },
        { code: 'TN-33-02', name: 'Nebeur', arabicName: 'نبر', postalCode: '7150' },
        { code: 'TN-33-03', name: 'Sakiet Sidi Youssef', arabicName: 'ساقية سيدي يوسف', postalCode: '7140' },
        { code: 'TN-33-04', name: 'Tajerouine', arabicName: 'تاجروين', postalCode: '7120' },
        { code: 'TN-33-05', name: 'Touiref', arabicName: 'طويرف', postalCode: '7161' },
        { code: 'TN-33-06', name: 'Sers', arabicName: 'سرس', postalCode: '7140' },
        { code: 'TN-33-07', name: 'El Ksour', arabicName: 'القصور', postalCode: '7115' },
        { code: 'TN-33-08', name: 'Dahmani', arabicName: 'الدهماني', postalCode: '7130' },
        { code: 'TN-33-09', name: 'Sidi Bouzid', arabicName: 'سيدي بوزيد', postalCode: '7163' },
        { code: 'TN-33-10', name: 'Jérissa', arabicName: 'جريصة', postalCode: '7135' },
        { code: 'TN-33-11', name: 'Kalaat Senan', arabicName: 'قلعة سنان', postalCode: '7164' }
      ]
    },
    {
      code: 'TN-34',
      name: 'Siliana',
      arabicName: 'سليانة',
      delegations: [
        { code: 'TN-34-01', name: 'Siliana Nord', arabicName: 'سليانة الشمالية', postalCode: '6100' },
        { code: 'TN-34-02', name: 'Siliana Sud', arabicName: 'سليانة الجنوبية', postalCode: '6100' },
        { code: 'TN-34-03', name: 'Bou Arada', arabicName: 'بوعرادة', postalCode: '6140' },
        { code: 'TN-34-04', name: 'Gaâfour', arabicName: 'قعفور', postalCode: '6150' },
        { code: 'TN-34-05', name: 'El Krib', arabicName: 'الكريب', postalCode: '6170' },
        { code: 'TN-34-06', name: 'Sidi Bou Rouis', arabicName: 'سيدي بوروي', postalCode: '6130' },
        { code: 'TN-34-07', name: 'Maktar', arabicName: 'مكثر', postalCode: '6190' },
        { code: 'TN-34-08', name: 'Rouhia', arabicName: 'الروحية', postalCode: '6122' },
        { code: 'TN-34-09', name: 'Kesra', arabicName: 'كسرى', postalCode: '6160' },
        { code: 'TN-34-10', name: 'Bargou', arabicName: 'برقو', postalCode: '6180' },
        { code: 'TN-34-11', name: 'El Aroussa', arabicName: 'العروسة', postalCode: '6125' }
      ]
    },
    {
      code: 'TN-41',
      name: 'Sousse',
      arabicName: 'سوسة',
      delegations: [
        { code: 'TN-41-01', name: 'Sousse Médina', arabicName: 'سوسة المدينة', postalCode: '4000' },
        { code: 'TN-41-02', name: 'Sousse Jawhara', arabicName: 'سوسة الجوهرة', postalCode: '4000' },
        { code: 'TN-41-03', name: 'Sousse Riadh', arabicName: 'سوسة الرياض', postalCode: '4023' },
        { code: 'TN-41-04', name: 'Sousse Sidi Abdelhamid', arabicName: 'سوسة سيدي عبد الحميد', postalCode: '4065' },
        { code: 'TN-41-05', name: 'Hammam Sousse', arabicName: 'حمام سوسة', postalCode: '4011' },
        { code: 'TN-41-06', name: 'Akouda', arabicName: 'أكودة', postalCode: '4022' },
        { code: 'TN-41-07', name: 'Kalâa Kebira', arabicName: 'قلعة الكبيرة', postalCode: '4060' },
        { code: 'TN-41-08', name: 'Kalâa Seghira', arabicName: 'قلعة الصغيرة', postalCode: '4021' },
        { code: 'TN-41-09', name: 'Sidi Bou Ali', arabicName: 'سيدي بوعلي', postalCode: '4050' },
        { code: 'TN-41-10', name: 'Hergla', arabicName: 'هرقلة', postalCode: '4013' },
        { code: 'TN-41-11', name: 'Enfida', arabicName: 'الأنفيضة', postalCode: '4030' },
        { code: 'TN-41-12', name: 'Bouficha', arabicName: 'بوفيشة', postalCode: '4040' },
        { code: 'TN-41-13', name: 'Sidi El Hani', arabicName: 'سيدي الهاني', postalCode: '4070' },
        { code: 'TN-41-14', name: 'M\'saken', arabicName: 'مساكن', postalCode: '4070' },
        { code: 'TN-41-15', name: 'Zaouiet Sousse', arabicName: 'زاوية سوسة', postalCode: '4019' },
        { code: 'TN-41-16', name: 'Kondar', arabicName: 'قندار', postalCode: '4072' }
      ]
    },
    {
      code: 'TN-42',
      name: 'Monastir',
      arabicName: 'المنستير',
      delegations: [
        { code: 'TN-42-01', name: 'Monastir', arabicName: 'المنستير', postalCode: '5000' },
        { code: 'TN-42-02', name: 'Ouerdanine', arabicName: 'وردانين', postalCode: '5099' },
        { code: 'TN-42-03', name: 'Sahline', arabicName: 'الساحلين', postalCode: '5070' },
        { code: 'TN-42-04', name: 'Zeramdine', arabicName: 'زرمدين', postalCode: '5020' },
        { code: 'TN-42-05', name: 'Bembla', arabicName: 'بنبلة', postalCode: '5050' },
        { code: 'TN-42-06', name: 'Jemmal', arabicName: 'جمال', postalCode: '5100' },
        { code: 'TN-42-07', name: 'Lamta', arabicName: 'لمطة', postalCode: '5080' },
        { code: 'TN-42-08', name: 'Bekalta', arabicName: 'بقالطة', postalCode: '5090' },
        { code: 'TN-42-09', name: 'Moknine', arabicName: 'المكنين', postalCode: '5026' },
        { code: 'TN-42-10', name: 'Sayada-Lamta-Bou Hajar', arabicName: 'الصيادة-لمطة-بوهجار', postalCode: '5058' },
        { code: 'TN-42-11', name: 'Téboulba', arabicName: 'طبلبة', postalCode: '5080' },
        { code: 'TN-42-12', name: 'Ksar Hellal', arabicName: 'قصر هلال', postalCode: '5070' },
        { code: 'TN-42-13', name: 'Ksibet el-Médiouni', arabicName: 'قصيبة المديوني', postalCode: '5010' }
      ]
    },
    {
      code: 'TN-43',
      name: 'Mahdia',
      arabicName: 'المهدية',
      delegations: [
        { code: 'TN-43-01', name: 'Mahdia', arabicName: 'المهدية', postalCode: '5100' },
        { code: 'TN-43-02', name: 'Bou Merdes', arabicName: 'بومرداس', postalCode: '5140' },
        { code: 'TN-43-03', name: 'Ouled Chamekh', arabicName: 'أولاد شامخ', postalCode: '5112' },
        { code: 'TN-43-04', name: 'Chorbane', arabicName: 'الشربان', postalCode: '5160' },
        { code: 'TN-43-05', name: 'Hebira', arabicName: 'الهبيرة', postalCode: '5134' },
        { code: 'TN-43-06', name: 'Rejiche', arabicName: 'راجيش', postalCode: '5150' },
        { code: 'TN-43-07', name: 'Melloulèche', arabicName: 'ملولش', postalCode: '5162' },
        { code: 'TN-43-08', name: 'Sidi Alouane', arabicName: 'سيدي علوان', postalCode: '5115' },
        { code: 'TN-43-09', name: 'Ksour Essef', arabicName: 'قصور الساف', postalCode: '5170' },
        { code: 'TN-43-10', name: 'El Jem', arabicName: 'الجم', postalCode: '5160' },
        { code: 'TN-43-11', name: 'Chebba', arabicName: 'الشابة', postalCode: '5080' }
      ]
    },
    {
      code: 'TN-51',
      name: 'Kairouan',
      arabicName: 'القيروان',
      delegations: [
        { code: 'TN-51-01', name: 'Kairouan Nord', arabicName: 'القيروان الشمالية', postalCode: '3100' },
        { code: 'TN-51-02', name: 'Kairouan Sud', arabicName: 'القيروان الجنوبية', postalCode: '3100' },
        { code: 'TN-51-03', name: 'Sbikha', arabicName: 'سبيخة', postalCode: '3140' },
        { code: 'TN-51-04', name: 'Oueslatia', arabicName: 'الوسلاتية', postalCode: '3150' },
        { code: 'TN-51-05', name: 'Haffouz', arabicName: 'حفوز', postalCode: '3120' },
        { code: 'TN-51-06', name: 'Alâa', arabicName: 'العلا', postalCode: '3160' },
        { code: 'TN-51-07', name: 'Hajeb El Ayoun', arabicName: 'حاجب العيون', postalCode: '3170' },
        { code: 'TN-51-08', name: 'Nasrallah', arabicName: 'نصر الله', postalCode: '3180' },
        { code: 'TN-51-09', name: 'Menzel Mehiri', arabicName: 'منزل مهيري', postalCode: '3141' },
        { code: 'TN-51-10', name: 'Echrarda', arabicName: 'الشراردة', postalCode: '3194' },
        { code: 'TN-51-11', name: 'Bouhajla', arabicName: 'بوحجلة', postalCode: '3190' },
        { code: 'TN-51-12', name: 'Chebika', arabicName: 'الشبيكة', postalCode: '3142' },
        { code: 'TN-51-13', name: 'El Oueslatia', arabicName: 'الوسلاتية', postalCode: '3190' }
      ]
    },
    {
      code: 'TN-52',
      name: 'Kasserine',
      arabicName: 'القصرين',
      delegations: [
        { code: 'TN-52-01', name: 'Kasserine Nord', arabicName: 'القصرين الشمالية', postalCode: '1200' },
        { code: 'TN-52-02', name: 'Kasserine Sud', arabicName: 'القصرين الجنوبية', postalCode: '1200' },
        { code: 'TN-52-03', name: 'Sbeitla', arabicName: 'سبيطلة', postalCode: '1220' },
        { code: 'TN-52-04', name: 'Sbiba', arabicName: 'سبيبة', postalCode: '1250' },
        { code: 'TN-52-05', name: 'Jedelienne', arabicName: 'جدليان', postalCode: '1262' },
        { code: 'TN-52-06', name: 'Thala', arabicName: 'تالة', postalCode: '1275' },
        { code: 'TN-52-07', name: 'Haïdra', arabicName: 'حيدرة', postalCode: '1240' },
        { code: 'TN-52-08', name: 'Foussana', arabicName: 'فوسانة', postalCode: '1260' },
        { code: 'TN-52-09', name: 'Fériana', arabicName: 'فريانة', postalCode: '1230' },
        { code: 'TN-52-10', name: 'Majel Bel Abbès', arabicName: 'ماجل بلعباس', postalCode: '1265' },
        { code: 'TN-52-11', name: 'El Ayoun', arabicName: 'العيون', postalCode: '1244' }
      ]
    },
    {
      code: 'TN-53',
      name: 'Sidi Bouzid',
      arabicName: 'سيدي بوزيد',
      delegations: [
        { code: 'TN-53-01', name: 'Sidi Bouzid Ouest', arabicName: 'سيدي بوزيد الغربية', postalCode: '9100' },
        { code: 'TN-53-02', name: 'Sidi Bouzid Est', arabicName: 'سيدي بوزيد الشرقية', postalCode: '9100' },
        { code: 'TN-53-03', name: 'Jilma', arabicName: 'جلمة', postalCode: '9140' },
        { code: 'TN-53-04', name: 'Cebbala Ouled Asker', arabicName: 'سبالة أولاد عسكر', postalCode: '9170' },
        { code: 'TN-53-05', name: 'Bir El Hafey', arabicName: 'بئر الحفي', postalCode: '9120' },
        { code: 'TN-53-06', name: 'Sidi Ali Ben Aoun', arabicName: 'سيدي علي بن عون', postalCode: '9130' },
        { code: 'TN-53-07', name: 'Menzel Bouzaiane', arabicName: 'منزل بوزيان', postalCode: '9160' },
        { code: 'TN-53-08', name: 'Mezzouna', arabicName: 'مزونة', postalCode: '9190' },
        { code: 'TN-53-09', name: 'Regueb', arabicName: 'الرقاب', postalCode: '9150' },
        { code: 'TN-53-10', name: 'Ouled Haffouz', arabicName: 'أولاد حفوز', postalCode: '9180' },
        { code: 'TN-53-11', name: 'Souk Jedid', arabicName: 'السوق الجديد', postalCode: '9121' },
        { code: 'TN-53-12', name: 'Meknassy', arabicName: 'المكناسي', postalCode: '9200' }
      ]
    },
    {
      code: 'TN-61',
      name: 'Sfax',
      arabicName: 'صفاقس',
      delegations: [
        { code: 'TN-61-01', name: 'Sfax Ville', arabicName: 'صفاقس المدينة', postalCode: '3000' },
        { code: 'TN-61-02', name: 'Sfax Ouest', arabicName: 'صفاقس الغربية', postalCode: '3003' },
        { code: 'TN-61-03', name: 'Sfax Sud', arabicName: 'صفاقس الجنوبية', postalCode: '3000' },
        { code: 'TN-61-04', name: 'Sakiet Ezzit', arabicName: 'ساقية الزيت', postalCode: '3021' },
        { code: 'TN-61-05', name: 'Sakiet Eddaïer', arabicName: 'ساقية الدائر', postalCode: '3085' },
        { code: 'TN-61-06', name: 'Gremda', arabicName: 'قرمدة', postalCode: '3052' },
        { code: 'TN-61-07', name: 'El Amra', arabicName: 'العامرة', postalCode: '3040' },
        { code: 'TN-61-08', name: 'Hezoua', arabicName: 'حزوة', postalCode: '3060' },
        { code: 'TN-61-09', name: 'Jebiniana', arabicName: 'جبنيانة', postalCode: '3090' },
        { code: 'TN-61-10', name: 'El Hencha', arabicName: 'الهنشة', postalCode: '3050' },
        { code: 'TN-61-11', name: 'Menzel Chaker', arabicName: 'منزل شاكر', postalCode: '3070' },
        { code: 'TN-61-12', name: 'Agareb', arabicName: 'عقارب', postalCode: '3110' },
        { code: 'TN-61-13', name: 'Skhira', arabicName: 'الصخيرة', postalCode: '3080' },
        { code: 'TN-61-14', name: 'Bir Ali Ben Khalifa', arabicName: 'بئر علي بن خليفة', postalCode: '3044' },
        { code: 'TN-61-15', name: 'Ghraïba', arabicName: 'الغريبة', postalCode: '3062' },
        { code: 'TN-61-16', name: 'Kerkennah', arabicName: 'قرقنة', postalCode: '3070' }
      ]
    },
    {
      code: 'TN-71',
      name: 'Gafsa',
      arabicName: 'قفصة',
      delegations: [
        { code: 'TN-71-01', name: 'Gafsa Nord', arabicName: 'قفصة الشمالية', postalCode: '2100' },
        { code: 'TN-71-02', name: 'Gafsa Sud', arabicName: 'قفصة الجنوبية', postalCode: '2100' },
        { code: 'TN-71-03', name: 'El Ksar', arabicName: 'القصر', postalCode: '2140' },
        { code: 'TN-71-04', name: 'Moularès', arabicName: 'المولارس', postalCode: '2160' },
        { code: 'TN-71-05', name: 'Redeyef', arabicName: 'الرديف', postalCode: '2170' },
        { code: 'TN-71-06', name: 'Métlaoui', arabicName: 'المتلوي', postalCode: '2180' },
        { code: 'TN-71-07', name: 'Mdhilla', arabicName: 'المظيلة', postalCode: '2190' },
        { code: 'TN-71-08', name: 'El Guettar', arabicName: 'القطار', postalCode: '2150' },
        { code: 'TN-71-09', name: 'Sened', arabicName: 'سند', postalCode: '2130' },
        { code: 'TN-71-10', name: 'Belkhir', arabicName: 'بلخير', postalCode: '2155' },
        { code: 'TN-71-11', name: 'El Metouia', arabicName: 'المتوية', postalCode: '2165' }
      ]
    },
    {
      code: 'TN-72',
      name: 'Tozeur',
      arabicName: 'توزر',
      delegations: [
        { code: 'TN-72-01', name: 'Tozeur', arabicName: 'توزر', postalCode: '2200' },
        { code: 'TN-72-02', name: 'Degache', arabicName: 'دقاش', postalCode: '2260' },
        { code: 'TN-72-03', name: 'Nefta', arabicName: 'نفطة', postalCode: '2240' },
        { code: 'TN-72-04', name: 'Tameghza', arabicName: 'تمغزة', postalCode: '2267' },
        { code: 'TN-72-05', name: 'Hazoua', arabicName: 'حزوة', postalCode: '2213' }
      ]
    },
    {
      code: 'TN-73',
      name: 'Kébili',
      arabicName: 'قبلي',
      delegations: [
        { code: 'TN-73-01', name: 'Kébili Nord', arabicName: 'قبلي الشمالية', postalCode: '4200' },
        { code: 'TN-73-02', name: 'Kébili Sud', arabicName: 'قبلي الجنوبية', postalCode: '4200' },
        { code: 'TN-73-03', name: 'Douz Nord', arabicName: 'دوز الشمالية', postalCode: '4260' },
        { code: 'TN-73-04', name: 'Douz Sud', arabicName: 'دوز الجنوبية', postalCode: '4260' },
        { code: 'TN-73-05', name: 'Faouar', arabicName: 'فوار', postalCode: '4283' },
        { code: 'TN-73-06', name: 'Souk Lahad', arabicName: 'سوق الأحد', postalCode: '4212' }
      ]
    },
    {
      code: 'TN-81',
      name: 'Gabès',
      arabicName: 'قابس',
      delegations: [
        { code: 'TN-81-01', name: 'Gabès Ville', arabicName: 'قابس المدينة', postalCode: '6000' },
        { code: 'TN-81-02', name: 'Gabès Ouest', arabicName: 'قابس الغربية', postalCode: '6000' },
        { code: 'TN-81-03', name: 'Gabès Sud', arabicName: 'قابس الجنوبية', postalCode: '6000' },
        { code: 'TN-81-04', name: 'Hamma', arabicName: 'الحامة', postalCode: '6020' },
        { code: 'TN-81-05', name: 'Matmata', arabicName: 'مطماطة', postalCode: '6070' },
        { code: 'TN-81-06', name: 'Nouvelle Matmata', arabicName: 'مطماطة الجديدة', postalCode: '6082' },
        { code: 'TN-81-07', name: 'Mareth', arabicName: 'مارث', postalCode: '6030' },
        { code: 'TN-81-08', name: 'Zarat', arabicName: 'زارات', postalCode: '6040' },
        { code: 'TN-81-09', name: 'El Hamma', arabicName: 'الحامة', postalCode: '6020' },
        { code: 'TN-81-10', name: 'Menzel El Habib', arabicName: 'منزل الحبيب', postalCode: '6044' }
      ]
    },
    {
      code: 'TN-82',
      name: 'Médenine',
      arabicName: 'مدنين',
      delegations: [
        { code: 'TN-82-01', name: 'Médenine Nord', arabicName: 'مدنين الشمالية', postalCode: '4100' },
        { code: 'TN-82-02', name: 'Médenine Sud', arabicName: 'مدنين الجنوبية', postalCode: '4100' },
        { code: 'TN-82-03', name: 'Beni Khedache', arabicName: 'بني خداش', postalCode: '4130' },
        { code: 'TN-82-04', name: 'Ben Gardane', arabicName: 'بن قردان', postalCode: '4135' },
        { code: 'TN-82-05', name: 'Houmt Souk', arabicName: 'حومة السوق', postalCode: '4180' },
        { code: 'TN-82-06', name: 'Midoun', arabicName: 'ميدون', postalCode: '4116' },
        { code: 'TN-82-07', name: 'Ajim', arabicName: 'أجيم', postalCode: '4185' },
        { code: 'TN-82-08', name: 'Sidi Makhlouf', arabicName: 'سيدي مخلوف', postalCode: '4140' },
        { code: 'TN-82-09', name: 'Zarzis', arabicName: 'جرجيس', postalCode: '4170' }
      ]
    },
    {
      code: 'TN-83',
      name: 'Tataouine',
      arabicName: 'تطاوين',
      delegations: [
        { code: 'TN-83-01', name: 'Tataouine Nord', arabicName: 'تطاوين الشمالية', postalCode: '3200' },
        { code: 'TN-83-02', name: 'Tataouine Sud', arabicName: 'تطاوين الجنوبية', postalCode: '3200' },
        { code: 'TN-83-03', name: 'Bir Lahmar', arabicName: 'بئر لحمر', postalCode: '3250' },
        { code: 'TN-83-04', name: 'Ghomrassen', arabicName: 'غمراسن', postalCode: '3230' },
        { code: 'TN-83-05', name: 'Dehiba', arabicName: 'الذهيبة', postalCode: '3280' },
        { code: 'TN-83-06', name: 'Remada', arabicName: 'رمادة', postalCode: '3260' },
        { code: 'TN-83-07', name: 'Smâr', arabicName: 'سمار', postalCode: '3270' }
      ]
    }
  ];

  constructor() { }

  /**
   * Get all governorates
   */
  getGovernorates(): TunisianGovernorate[] {
    return this.governorates;
  }

  /**
   * Get governorate by code
   */
  getGovernorateByCode(code: string): TunisianGovernorate | undefined {
    return this.governorates.find(g => g.code === code);
  }

  /**
   * Get governorate by name
   */
  getGovernorateByName(name: string): TunisianGovernorate | undefined {
    return this.governorates.find(g =>
      g.name.toLowerCase() === name.toLowerCase() ||
      g.arabicName === name
    );
  }

  /**
   * Get delegations for a governorate
   */
  getDelegations(governorateCode: string): TunisianDelegation[] {
    const governorate = this.getGovernorateByCode(governorateCode);
    return governorate ? governorate.delegations : [];
  }

  /**
   * Get delegation by code
   */
  getDelegationByCode(delegationCode: string): TunisianDelegation | undefined {
    for (const governorate of this.governorates) {
      const delegation = governorate.delegations.find(d => d.code === delegationCode);
      if (delegation) return delegation;
    }
    return undefined;
  }

  /**
   * Search locations by name (governorates and delegations)
   */
  searchLocations(query: string): { governorates: TunisianGovernorate[], delegations: TunisianDelegation[] } {
    const lowerQuery = query.toLowerCase();
    const matchingGovernorates = this.governorates.filter(g =>
      g.name.toLowerCase().includes(lowerQuery) ||
      g.arabicName.includes(query)
    );

    const matchingDelegations: TunisianDelegation[] = [];
    for (const governorate of this.governorates) {
      const delegations = governorate.delegations.filter(d =>
        d.name.toLowerCase().includes(lowerQuery) ||
        d.arabicName.includes(query)
      );
      matchingDelegations.push(...delegations);
    }

    return { governorates: matchingGovernorates, delegations: matchingDelegations };
  }

  /**
   * Get simple list for dropdowns
   */
  getGovernorateOptions(): { value: string, label: string, arabicLabel: string }[] {
    return this.governorates.map(g => ({
      value: g.code,
      label: g.name,
      arabicLabel: g.arabicName
    }));
  }

  /**
   * Get delegation options for a specific governorate
   */
  getDelegationOptions(governorateCode: string): { value: string, label: string, arabicLabel: string }[] {
    const delegations = this.getDelegations(governorateCode);
    return delegations.map(d => ({
      value: d.code,
      label: d.name,
      arabicLabel: d.arabicName
    }));
  }
}
