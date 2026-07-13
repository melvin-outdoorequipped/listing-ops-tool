// lib/task-options.ts
// Shared constants for the Task Masterlist dashboard: dropdown options that
// mirror the Google Sheet's Data Validation lists, plus the list of users
// allowed to add new tasks / edit tasks that aren't their own.
//
// Keep this in sync with the actual dropdown lists in the "Copy of Task
// Masterlist - Operations" sheet (columns D, E, F, H). If someone adds a new
// Brand/Agent/Type/Task option in the sheet, add it here too.

export const ADMIN_EMAILS = [
  'arlie@outdoorequipped.com',
  'jonisa@outdoorequipped.com',
  'melvin@outdoorequipped.com',
  'jogie@outdoorequipped.com'
];

export function isTaskAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

// Column D — Type
export const TYPE_OPTIONS = [
  'Creation',
  'Correction',
  'Assistance',
  'Creation/Correction',
  'Analysis',
  'Creation/Assistance',
  'Correction/Assistance',
  'Modification/Creation',
  'Duplicate Creation',
  'Rerun',
];

// Column E — Task
export const TASK_OPTIONS = [
  'Listing Concern',
  'Stranded',
  'Listing WH - Audit',
  'Prebook',
  'Shopkeep',
  'Amazon Prime',
  'Listing Concern-WH',
  'LL Result',
  'UPC Match',
  'Data Validation',
  'Bulks',
  'Suppressed',
  'Opening Order',
  'Test Order',
  'New Supplier',
  'Stocks Monitoring',
  'Non UPC Match',
  'List Price',
];

// Column F — Brand (deduped, trimmed, order preserved from the sheet's list)
const RAW_BRAND_OPTIONS = [
  '361 Footwear','Altra','Arborwear','Axxiom','Baffin','Berne','Butler Boots',
  'Danner/Lacrosse','Dockers Footwear','Filson - (Use Timberland)','Fox River',
  'FSI','Gordini','Grundens','Helly Hansen','Hot Chillys','Icebreaker','Merrell',
  'Naot Footwear','Obermeyer','Rocky','Sea to Summit','Snow Angel','Stance',
  'StormR','Swany','Terramar','Thorogood','Western Chief','Wigwam','Craghoppers',
  'Vibram','Henderson/Hyperflex Line','Smartwool','Balega Socks','Sockwell',
  'Goodr','AdTec','Alps Brands',"Arm's Reach",'Bekina','Belleville/Tactical Research',
  'Booyah','Brandit','Carhartt Footwear','CAT Workwear','Colgate Mattress',
  'Eagle Creek','Evenflo','Footmates','Frye','Gladly Family','Helly Hansen Workwear',
  'Helly Hansen Sportswear','Joovy','Old Friend','Orvis','PlanToys','Safety Jogger',
  'Seiko','Tasmanian Tiger','Tsukihoshi','UR Shield','Viking','Wonderfold','Wondersip',
  'Asics','Giro, Bell, Blackburn','New Balance','Nike Swim','Oakley','PF Flyers',
  'POC','Skechers Kids','Skechers Lifestyle','Skechers Performance',
  'Skechers Mark Nason','Skechers Work','Skechers Bobs','TYR','K-Swiss','Acorn',
  'Cougar','Cutter & Buck','Dockers Apparel','Dorfman Pacific','Easy Street',
  'EMU Australia','Fitflop','Haflinger','Haggar','Kangol/Bailey','Lucky Brand',
  'Mephisto','Minnetonka Moccasin','Neil M','OTBT','Scully','Sorel','Supra',
  'Stetson and Dobbs Hats','TOMS','Trotters & Softwalk','GH Bass','Wolky',
  'Bearpaw','Royal Robbins','Palladium','Clarks','Bella Vita','Adidas','Chaco',
  'Dakine','DC','Hurley','Kamik','Mammut','Mountain Hardwear',"O'Neill",
  'Outdoor Gear','Pajar Canada','Quiksilver/Roxy','The North Face',
  'Woolrich Apparel','Kombi Gloves','Hanwag/Fjallraven','Hotfingers','Manzella',
  'Darn Tough','Ariat','Belleville','CAT, Wolverine & Cushe','Dansko','Klogs',
  'Lee Jeans','Lugz','Old West Boots','Outback Trading','Puma Work','Rasco',
  'Smoky Mountain','Stetson/Roper','Timberland Footwear','Timberland Apparel',
  'Twisted X Boots','VF Imagewear','Wrangler','Tamarindo Footwear','Dan Post',
  'Bolle Brands','Carhartt','HUK','Shurhold','Steve Madden','Naot',
  'Muck Boots Brands','Refrigiwear','Tru-spec','Sitka Gear','Kryptek','Korkers',
  'Weatherbeeta','Jag Jeans','Shires','Justin Brands','Alegria','McKlein',
  'Fieldsheer','Bogs','Maui Jim','Evolv','The Rockport Group',
  'Tasmanian Tiger & Snugpak','HH Brown','Servus','Carolina Boots','Kuhl',
  'Kaepa','Reebok','Mavi Jeans','Hunter','C Seven','Barebones','Born',
  'Icebreaker Merino CA','Reef','Dockers Exclusive','Hot Chocolate Design',
  "Levi's",'Silver Jeans','O\'Neill Apparel','Adidas Terrex','Adidas Five Ten',
  'Carolina/Double H Boots','On Running','Free Fly','Deer Stags','Cobian',
  'Gill','Lift Safety','Katadyn','Rockport','Hari Mari','Suncloud','Cole Haan',
  'Casio','Salewa','Xtratuf','Vertx','FSI/Surewerx','Cybex','Casio G Shock',
  'Ostrich','Shibumi','Sunbum','Warson Brands','Olukai','Marathon','Eastland',
  'Revo','Northside','Lemon Jelly','Strive','Flojos','Keds','Keen',
  'TRUE Linkswear',
];

export const BRAND_OPTIONS = Array.from(
  new Set(RAW_BRAND_OPTIONS.map((b) => b.trim()))
);

// Special sentinel used in the UI to let admins type a brand that isn't in
// the dropdown yet (per the request: "we can also add if the brand name is
// not there").
export const OTHER_BRAND_OPTION = '__OTHER__';

// Column H — Agent
export const AGENT_OPTIONS = [
  'Alfranz','Alvin','Aries','Christopher','Cyriel','Eman','Joshue','Jywency',
  'Philip','Valentine','Luche','Djan','Allan','Clemente','Ruel','Chrizza Mae',
  'Gerald','Luigi','Jerael','Joshua','Pete','Donald','Timothy','Jogie',
  'Mikhail','Jeremy','Sherry','Jencel','Aljhon','Cary','Shiela','Ted','Thach',
  'Ronald','Tin','Cuong','Jade','Quincy','Syrus','Mervin','Patricio','Jessan',
  'Aila','Reymart','Gerome','Jufet','Jessa','Kayla','Jochele','Menchie',
  'Romart','Khristine','Odith','Clef','Jhon','Jade Ducay','Christian','Marisa',
  'Jusheen','Merry','Romar','Joren','Niel','Florante','Wyndell','Anthony',
  'Sedney','Peter','Dannese','Jonisa','Thomas','Kate','Micaela','Rejei',
  'Shenna','Dave Rick','Rhoda','Vincent Mathew','Juddy','Lawrence','Janroe',
  'Melvin','Mark Vincen','Junard','Jerald',
];

export const VALID_TASK_STATUSES = [
  'Assigned',
  'Completed',
  'Ongoing',
  'Pending',
  'For Audit',
  'WIP',
  'For Investigation',
  'Cancelled',
  'Hold',
  'For Correx',
] as const;