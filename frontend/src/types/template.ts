
export interface Template {
  id: number;
  name: string;
  content: string;
  type: "email" | "pdf";
  category?: "client" | "furnizor" | "general" | "fise";
}

export interface TemplateVariable {
  id: number;
  name: string;
  description: string;
}

export const TEMPLATE_VARIABLES = [
  { id: 1, name: "[NUME_PARTENER]", description: "Numele partenerului" },
  { id: 2, name: "[CUI_PARTENER]", description: "CUI-ul partenerului" },
  { id: 3, name: "[DATA]", description: "Data confirmării" },
  { id: 4, name: "[NUME_COMPANIE]", description: "Numele companiei" },
  { id: 5, name: "[DATA_TRIMITERE]", description: "Data trimiterii" },
  { id: 6, name: "[PERIOADA]", description: "Perioada confirmării" },
  { id: 7, name: "[OBSERVATII]", description: "Observații suplimentare" },
  { id: 8, name: "[ADRESA_PARTENER]", description: "Adresa partenerului" },
  { id: 9, name: "[TELEFON_PARTENER]", description: "Telefonul partenerului" },
  { id: 10, name: "[EMAIL_PARTENER]", description: "Email-ul partenerului" },
  { id: 11, name: "[NUMĂR_ORDINE]", description: "Numărul de ordine din documentele emise" }
];

export const initialTemplates: Template[] = [
  {
    id: 1,
    name: "Email Standard",
    content: "Stimată Companie,\n\nVă trimitem atașat cererea de confirmare a soldului la data de [DATA].\n\nVă rugăm să verificați și să confirmați informațiile pentru perioada [PERIOADA].\n\nCu stimă,\n[NUME_COMPANIE]",
    type: "email",
    category: "general"
  },
  {
    id: 2,
    name: "Confirmare Sold PDF",
    content: "<h1>CONFIRMARE DE SOLD</h1>\n<p>Către: [NUME_PARTENER]</p>\n<p>CUI: [CUI_PARTENER]</p>\n<p>Confirmăm prin prezenta că la data de [DATA], conform evidențelor noastre contabile, există relații comerciale cu societatea dumneavoastră pentru perioada [PERIOADA].</p>\n<p>Vă rugăm să confirmați corectitudinea acestei informații prin completarea și returnarea acestui document semnat și ștampilat.</p>\n<p><br/><br/></p>\n<p>Data: ____________</p>\n<p>Semnătură și ștampilă: ____________</p>",
    type: "pdf",
    category: "general"
  },
  {
    id: 3,
    name: "Email Reminder",
    content: "Stimată Companie,\n\nVă reamintim că nu am primit încă confirmarea soldului transmis la data de [DATA_TRIMITERE].\n\nVă rugăm să ne transmiteți confirmarea cât mai curând posibil.\n\nCu stimă,\n[NUME_COMPANIE]",
    type: "email",
    category: "general"
  },
  {
    id: 4,
    name: "Confirmare Sold Furnizor",
    content: "<h1>CONFIRMARE DE SOLD FURNIZOR</h1>\n<p>Către: [NUME_PARTENER]</p>\n<p>CUI: [CUI_PARTENER]</p>\n<p>Stimată companie,</p>\n<p>Confirmăm prin prezenta că la data de [DATA], conform evidențelor noastre contabile, societatea dumneavoastră, în calitate de FURNIZOR, are relații comerciale cu societatea noastră pentru perioada [PERIOADA].</p>\n<p>Vă rugăm să confirmați corectitudinea acestei informații prin completarea și returnarea acestui document semnat și ștampilat.</p>\n<p><br/><br/></p>\n<p>Data: ____________</p>\n<p>Semnătură și ștampilă: ____________</p>",
    type: "pdf",
    category: "furnizor"
  },
  {
    id: 5,
    name: "Confirmare Sold Client",
    content: "<h1>CONFIRMARE DE SOLD CLIENT</h1>\n<p>Către: [NUME_PARTENER]</p>\n<p>CUI: [CUI_PARTENER]</p>\n<p>Stimată companie,</p>\n<p>Confirmăm prin prezenta că la data de [DATA], conform evidențelor noastre contabile, societatea dumneavoastră, în calitate de CLIENT, are relații comerciale cu societatea noastră pentru perioada [PERIOADA].</p>\n<p>Vă rugăm să confirmați corectitudinea acestei informații prin completarea și returnarea acestui document semnat și ștampilat.</p>\n<p><br/><br/></p>\n<p>Data: ____________</p>\n<p>Semnătură și ștampilă: ____________</p>",
    type: "pdf",
    category: "client"
  }
];
