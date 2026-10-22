'use strict';
// Single source of truth for modules, fields, enumerations and Arabic labels.
// The server builds tables and validation from it; the browser renders forms and tables from it.

const ENUM = {
  status: ['Not Started', 'Planned', 'In Progress', 'Submitted', 'Pending', 'Approved', 'Active', 'On Hold', 'Blocked', 'Complete', 'Renewal Due'],
  priority: ['P1 - Critical', 'P2 - High', 'P3 - Medium', 'P4 - Low'],
  owner: ['CEO', 'BD Director', 'Bids & Tenders Manager', 'Partnerships Manager', 'QHSE Manager', 'DC & Mission Critical Lead', 'ICT/OSP Lead',
    'ELV & Security Lead', 'MEP Lead', 'Cybersecurity Lead', 'Digital & Software Lead', 'BIM & Engineering Lead', 'PMO Lead', 'HR Manager',
    'Finance Manager', 'Legal & Contracts'],
  cap: ['Existing', 'Partial', 'Gap – Build', 'Gap – Partner'],
  route: ['Direct registration portal', 'Procurement/Vendor information page', 'Central platform – Etimad', 'Central platform – MUSAHAMA', 'Manual outreach'],
  oemRoute: ['Direct partner portal', 'Official partner page – portal not verified', 'Via KSA distributor', 'Manual outreach'],
  etype: ['Ministry', 'Government Authority/Agency', 'PIF & Portfolio Company', 'State-Owned/Utility', 'Semi-Government', 'Large Private Company',
    'Bank/Insurance', 'Telecom/Cloud/DC/Tech', 'Airport/Transport/Port', 'Health/Education', 'Real Estate/Giga/Industry/Energy'],
  horizon: ['90 Days', '180 Days', '365 Days'],
  verif: ['Verified – official page reviewed', 'Route verified at platform level; entity site not opened', 'Official domain – not opened this session; confirm'],
  ctype: ['Company', 'Individual'],
  mand: ['Mandatory', 'Conditional'],
  bu: ['Data Centers & Mission Critical', 'ICT & Digital Infrastructure', 'Smart Buildings & Cities', 'Cybersecurity', 'ELV & Physical Security',
    'MEP & Electromechanical', 'Digital Transformation & Software', 'Engineering, BIM & O&M'],
  ocat: ['Data Center power/cooling/racks', 'Networking/Wireless/SD-WAN', 'Cybersecurity/SOC/SIEM/PAM/EDR', 'Servers/HCI/Virtualization', 'Storage/Backup',
    'Cloud', 'BMS/BAS/SCADA', 'DCIM', 'ELV/CCTV/VMS', 'Access Control', 'Fire alarm/firefighting', 'AV/UC/command centers', 'Structured cabling/fiber',
    'MEP/generators/HVAC', 'Smart City/IoT', 'Software/ITSM/ERP/DevOps'],
  role: ['admin', 'manager', 'editor', 'viewer']
};

const AR = {
  status: { 'Not Started': 'لم يبدأ', 'Planned': 'مخطط', 'In Progress': 'قيد التنفيذ', 'Submitted': 'مُقدَّم', 'Pending': 'معلّق', 'Approved': 'معتمد', 'Active': 'نشط', 'On Hold': 'متوقف مؤقتًا', 'Blocked': 'متعثّر', 'Complete': 'مكتمل', 'Renewal Due': 'مستحق التجديد' },
  priority: { 'P1 - Critical': 'P1 حرج', 'P2 - High': 'P2 عالٍ', 'P3 - Medium': 'P3 متوسط', 'P4 - Low': 'P4 منخفض' },
  owner: { 'CEO': 'الرئيس التنفيذي', 'BD Director': 'مدير تطوير الأعمال', 'Bids & Tenders Manager': 'مدير العطاءات', 'Partnerships Manager': 'مدير الشراكات', 'QHSE Manager': 'مدير الجودة والسلامة', 'DC & Mission Critical Lead': 'قائد مراكز البيانات', 'ICT/OSP Lead': 'قائد الاتصالات والبنية', 'ELV & Security Lead': 'قائد التيار الخفيف والأمن', 'MEP Lead': 'قائد الكهروميكانيك', 'Cybersecurity Lead': 'قائد الأمن السيبراني', 'Digital & Software Lead': 'قائد التحول الرقمي', 'BIM & Engineering Lead': 'قائد الهندسة وBIM', 'PMO Lead': 'مدير مكتب المشاريع', 'HR Manager': 'مدير الموارد البشرية', 'Finance Manager': 'المدير المالي', 'Legal & Contracts': 'الشؤون القانونية والعقود' },
  cap: { 'Existing': 'قائمة', 'Partial': 'جزئية', 'Gap – Build': 'فجوة – بناء', 'Gap – Partner': 'فجوة – شراكة' },
  route: { 'Direct registration portal': 'بوابة تسجيل مباشرة', 'Procurement/Vendor information page': 'صفحة معلومات المشتريات', 'Central platform – Etimad': 'منصة اعتماد', 'Central platform – MUSAHAMA': 'منصة مساهمة', 'Manual outreach': 'تواصل مباشر' },
  oemRoute: { 'Direct partner portal': 'بوابة شركاء مباشرة', 'Official partner page – portal not verified': 'صفحة رسمية – البوابة غير مؤكدة', 'Via KSA distributor': 'عبر موزع محلي', 'Manual outreach': 'تواصل مباشر' },
  etype: { 'Ministry': 'وزارة', 'Government Authority/Agency': 'هيئة/جهة حكومية', 'PIF & Portfolio Company': 'صندوق الاستثمارات وشركاته', 'State-Owned/Utility': 'شركة حكومية/مرافق', 'Semi-Government': 'شبه حكومي', 'Large Private Company': 'شركة خاصة كبرى', 'Bank/Insurance': 'مصارف وتأمين', 'Telecom/Cloud/DC/Tech': 'اتصالات وسحابة وتقنية', 'Airport/Transport/Port': 'مطارات ونقل وموانئ', 'Health/Education': 'صحة وتعليم', 'Real Estate/Giga/Industry/Energy': 'عقار ومشاريع كبرى وصناعة' },
  horizon: { '90 Days': '90 يومًا', '180 Days': '180 يومًا', '365 Days': '365 يومًا' },
  verif: { 'Verified – official page reviewed': 'مُتحقَّق – صفحة رسمية', 'Route verified at platform level; entity site not opened': 'المسار مُتحقَّق عبر المنصة', 'Official domain – not opened this session; confirm': 'غير مُتحقَّق – يحتاج تأكيد' },
  ctype: { 'Company': 'شركة', 'Individual': 'أفراد' },
  mand: { 'Mandatory': 'إلزامي', 'Conditional': 'مشروط' },
  bu: { 'Data Centers & Mission Critical': 'مراكز البيانات والمنشآت الحرجة', 'ICT & Digital Infrastructure': 'الاتصالات والبنية الرقمية', 'Smart Buildings & Cities': 'المباني والمدن الذكية', 'Cybersecurity': 'الأمن السيبراني', 'ELV & Physical Security': 'التيار الخفيف والأمن المادي', 'MEP & Electromechanical': 'الأعمال الكهروميكانيكية', 'Digital Transformation & Software': 'التحول الرقمي والبرمجيات', 'Engineering, BIM & O&M': 'الهندسة وBIM والتشغيل' },
  role: { admin: 'مدير النظام', manager: 'الإدارة', editor: 'محرر', viewer: 'مشاهد' }
};

// F(key, arabic label, english label, type, options)
// types: text | textarea | select | date | number | url | user | bool
const F = (k, ar, en, type = 'text', o = {}) => ({ k, ar, en, type, ...o });
const G = (ar, en) => ({ group: true, ar, en });

const MODULES = {
  entities: {
    table: 'entities', prefix: 'ent', title: 'name', statusKey: 'status', dueKey: 'due', expKey: 'expiry', trackToggle: true,
    ar: 'الجهات والتأهيل', en: 'Entities & prequal',
    fields: [
      G('التعريف', 'Identity'),
      F('name', 'اسم الجهة', 'Entity name', 'text', { wide: 1, required: 1 }), F('type', 'نوع الجهة', 'Entity type', 'select', { e: 'etype' }),
      F('sector', 'القطاع', 'Sector'), F('eco', 'الملكية/المنظومة', 'Ownership/Ecosystem'), F('services', 'خدمات أوتاد ذات الصلة', 'Relevant Awtad services'),
      G('المتابعة', 'Tracking'),
      F('priority', 'الأولوية', 'Priority', 'select', { e: 'priority' }), F('status', 'الحالة', 'Status', 'select', { e: 'status' }),
      F('owner', 'الدور المسؤول', 'Owner role', 'select', { e: 'owner' }), F('assignee', 'المسؤول (شخص)', 'Assignee', 'user'),
      F('tracked', 'ضمن متتبع التأهيل', 'In prequal tracker', 'bool'), F('regId', 'رقم التسجيل/المورد', 'Registration ID'),
      F('start', 'تاريخ البدء', 'Start date', 'date'), F('due', 'تاريخ الاستحقاق', 'Due date', 'date'),
      F('submitted', 'تاريخ التقديم', 'Submission date', 'date'), F('expiry', 'الانتهاء/التجديد', 'Expiry/Renewal', 'date'),
      F('missing', 'المستندات الناقصة', 'Missing documents', 'textarea'), F('blocker', 'العائق', 'Blocker', 'textarea'),
      F('nextAction', 'الإجراء التالي', 'Next action', 'textarea', { wide: 1 }), F('notes', 'ملاحظات', 'Notes', 'textarea', { wide: 1 }),
      G('مسار التسجيل', 'Registration route'),
      F('route', 'نوع المسار', 'Route type', 'select', { e: 'route' }), F('portal', 'بوابة التسجيل', 'Vendor portal', 'url', { wide: 1 }),
      F('how', 'طريقة التسجيل', 'How to register', 'textarea', { wide: 1 }), F('docs', 'المستندات المطلوبة', 'Required documents', 'textarea', { wide: 1 }),
      F('contact', 'جهة التواصل', 'Procurement contact'), F('web', 'الموقع الرسمي', 'Official website', 'url'),
      G('التحقق', 'Verification'),
      F('source', 'رابط المصدر', 'Source URL', 'url', { wide: 1 }), F('verif', 'حالة التحقق', 'Verification status', 'select', { e: 'verif' }),
      F('verifiedAt', 'تاريخ آخر تحقق', 'Last verified', 'date')
    ],
    cols: [['name', 'الجهة', 'Entity', 'title'], ['type', 'النوع', 'Type', 'enum:etype'], ['priority', 'الأولوية', 'Priority', 'prio'], ['status', 'الحالة', 'Status', 'status'],
      ['owner', 'المسؤول', 'Owner', 'owner'], ['due', 'الاستحقاق', 'Due', 'due'], ['expiry', 'الانتهاء', 'Expiry', 'exp'], ['route', 'المسار', 'Route', 'enum:route']],
    filters: [['type', 'etype'], ['priority', 'priority'], ['status', 'status'], ['route', 'route']]
  },
  oems: {
    table: 'oems', prefix: 'oem', title: 'name', statusKey: 'status', dueKey: 'targetApproval', expKey: 'renewal', trackToggle: true,
    ar: 'الشراكات مع المصنّعين', en: 'OEM partnerships',
    fields: [
      G('التعريف', 'Identity'),
      F('name', 'المصنّع', 'OEM', 'text', { wide: 1, required: 1 }), F('category', 'الفئة', 'Category', 'select', { e: 'ocat' }), F('region', 'البلد/الإقليم', 'Country/Region'),
      F('program', 'برنامج الشراكة', 'Partner program', 'text', { wide: 1 }), F('tier', 'المستوى المستهدف', 'Target tier'),
      G('المتابعة', 'Tracking'),
      F('priority', 'الأولوية', 'Priority', 'select', { e: 'priority' }), F('status', 'الحالة', 'Status', 'select', { e: 'status' }),
      F('owner', 'الدور المسؤول', 'Owner role', 'select', { e: 'owner' }), F('assignee', 'المسؤول (شخص)', 'Assignee', 'user'),
      F('tracked', 'ضمن متتبع الشراكات', 'In partnership tracker', 'bool'),
      F('appDate', 'تاريخ الطلب', 'Application date', 'date'), F('targetApproval', 'تاريخ الاعتماد المستهدف', 'Target approval', 'date'),
      F('renewal', 'تاريخ التجديد', 'Renewal date', 'date'), F('trainingGap', 'فجوة التدريب', 'Training gap', 'textarea'), F('blocker', 'العائق', 'Blocker', 'textarea'),
      F('nextAction', 'الإجراء التالي', 'Next action', 'textarea', { wide: 1 }),
      G('المتطلبات والمسار', 'Requirements & route'),
      F('route', 'نوع المسار', 'Route type', 'select', { e: 'oemRoute' }), F('regUrl', 'رابط التسجيل', 'Registration URL', 'url', { wide: 1 }),
      F('how', 'طريقة التسجيل', 'How to register', 'textarea', { wide: 1 }), F('req', 'المتطلبات', 'Requirements', 'textarea'),
      F('training', 'متطلبات التدريب/الشهادات', 'Training/certifications', 'textarea'), F('revenue', 'متطلبات الإيراد/المرجعيات', 'Revenue/reference', 'textarea'),
      F('ksaNotes', 'ملاحظات الموزع المحلي', 'KSA channel notes', 'textarea'), F('notes', 'ملاحظات', 'Notes', 'textarea', { wide: 1 }), F('web', 'الموقع الرسمي', 'Official website', 'url'),
      G('التحقق', 'Verification'),
      F('source', 'رابط المصدر', 'Source URL', 'url', { wide: 1 }), F('verif', 'حالة التحقق', 'Verification status', 'select', { e: 'verif' }),
      F('verifiedAt', 'تاريخ آخر تحقق', 'Last verified', 'date')
    ],
    cols: [['name', 'المصنّع', 'OEM', 'title'], ['category', 'الفئة', 'Category', 'enum:ocat'], ['priority', 'الأولوية', 'Priority', 'prio'], ['status', 'الحالة', 'Status', 'status'],
      ['tier', 'المستوى', 'Tier', 'text'], ['owner', 'المسؤول', 'Owner', 'owner'], ['targetApproval', 'الاعتماد المستهدف', 'Target approval', 'due'], ['renewal', 'التجديد', 'Renewal', 'exp']],
    filters: [['category', 'ocat'], ['priority', 'priority'], ['status', 'status'], ['route', 'oemRoute']]
  },
  certs: {
    table: 'certs', prefix: 'cer', title: 'name', statusKey: 'status', dueKey: 'target',
    ar: 'الشهادات', en: 'Certifications',
    fields: [
      G('التعريف', 'Identity'),
      F('name', 'الشهادة/الإطار', 'Certification/framework', 'text', { wide: 1, required: 1 }), F('type', 'النوع', 'Type', 'select', { e: 'ctype' }),
      F('body', 'الجهة المانحة', 'Issuing body'), F('value', 'القيمة للأعمال', 'Business value', 'textarea'), F('lines', 'خطوط الخدمة', 'Service lines', 'textarea'),
      F('prereq', 'المتطلبات المسبقة', 'Prerequisites', 'textarea', { wide: 1 }),
      G('المتابعة', 'Tracking'),
      F('priority', 'الأولوية', 'Priority', 'select', { e: 'priority' }), F('status', 'الحالة', 'Status', 'select', { e: 'status' }),
      F('owner', 'الدور المسؤول', 'Owner role', 'select', { e: 'owner' }), F('assignee', 'المسؤول (شخص)', 'Assignee', 'user'),
      F('holders', 'حاملو الشهادة (أسماء)', 'Holders (names)', 'textarea', { wide: 1 }),
      F('start', 'البدء المخطط', 'Planned start', 'date'), F('target', 'الإنجاز المستهدف', 'Target completion', 'date'),
      F('months', 'المدة (أشهر)', 'Duration (months)', 'number'), F('effort', 'الجهد الداخلي (يوم عمل)', 'Internal effort (days)', 'number'),
      F('costLow', 'التكلفة التقديرية – أدنى (ريال)', 'Est. cost – low (SAR)', 'number'), F('costHigh', 'التكلفة التقديرية – أعلى (ريال)', 'Est. cost – high (SAR)', 'number'),
      F('costActual', 'التكلفة الفعلية (ريال)', 'Actual cost (SAR)', 'number'), F('renewal', 'التجديد/التعليم المستمر', 'Renewal/CPE'),
      F('dependency', 'الاعتمادية', 'Dependency'), F('nextAction', 'الإجراء التالي', 'Next action', 'textarea', { wide: 1 }),
      G('المصدر', 'Source'),
      F('url', 'المصدر الرسمي', 'Official source', 'url', { wide: 1 }), F('verif', 'حالة التحقق', 'Verification', 'select', { e: 'verif' }), F('verifiedAt', 'تاريخ آخر تحقق', 'Last verified', 'date')
    ],
    cols: [['name', 'الشهادة/الإطار', 'Certification', 'title'], ['type', 'النوع', 'Type', 'enum:ctype'], ['priority', 'الأولوية', 'Priority', 'prio'], ['status', 'الحالة', 'Status', 'status'],
      ['owner', 'المسؤول', 'Owner', 'owner'], ['target', 'المستهدف', 'Target', 'due'], ['costLow', 'التكلفة التقديرية (ريال)', 'Est. cost (SAR)', 'cost'], ['costActual', 'الفعلية', 'Actual', 'money']],
    filters: [['type', 'ctype'], ['priority', 'priority'], ['status', 'status'], ['owner', 'owner']]
  },
  docs: {
    table: 'documents', prefix: 'doc', title: 'name', statusKey: 'status', expKey: 'expiry',
    ar: 'المستندات', en: 'Documents',
    fields: [
      F('name', 'المستند', 'Document', 'text', { wide: 1, required: 1 }), F('category', 'التصنيف', 'Category'), F('mand', 'إلزامي/مشروط', 'Mandatory/Conditional', 'select', { e: 'mand' }),
      F('status', 'الحالة', 'Status', 'select', { e: 'status' }), F('owner', 'الدور المسؤول', 'Owner role', 'select', { e: 'owner' }), F('assignee', 'المسؤول (شخص)', 'Assignee', 'user'),
      F('issue', 'تاريخ الإصدار', 'Issue date', 'date'), F('expiry', 'تاريخ الانتهاء', 'Expiry date', 'date'),
      F('link', 'رابط الملف (SharePoint/OneDrive)', 'File link (SharePoint/OneDrive)', 'url', { wide: 1 }),
      F('usedFor', 'يُستخدم في', 'Used for', 'textarea'), F('acceptance', 'معايير القبول', 'Acceptance criteria', 'textarea'), F('renewal', 'إجراء التجديد', 'Renewal action', 'textarea', { wide: 1 })
    ],
    cols: [['name', 'المستند', 'Document', 'title'], ['category', 'التصنيف', 'Category', 'text'], ['mand', 'النوع', 'Type', 'enum:mand'], ['status', 'الحالة', 'Status', 'status'],
      ['owner', 'المسؤول', 'Owner', 'owner'], ['expiry', 'الانتهاء', 'Expiry', 'exp'], ['link', 'الملف', 'File', 'link']],
    filters: [['category', null], ['mand', 'mand'], ['status', 'status'], ['owner', 'owner']]
  },
  actions: {
    table: 'actions', prefix: 'act', title: 'action', statusKey: 'status', dueKey: 'due',
    ar: 'الإجراءات', en: 'Actions',
    fields: [
      F('action', 'الإجراء', 'Action', 'textarea', { wide: 1, required: 1 }), F('code', 'الرمز', 'ID'), F('workstream', 'مسار العمل', 'Workstream'),
      F('priority', 'الأولوية', 'Priority', 'select', { e: 'priority' }), F('status', 'الحالة', 'Status', 'select', { e: 'status' }),
      F('owner', 'الدور المسؤول', 'Owner role', 'select', { e: 'owner' }), F('assignee', 'المسؤول (شخص)', 'Assignee', 'user'),
      F('due', 'تاريخ الاستحقاق', 'Due date', 'date'), F('dependency', 'الاعتمادية', 'Dependency'), F('linked', 'مرتبط بـ', 'Linked record', 'text', { wide: 1 }),
      F('blocker', 'العائق', 'Blocker', 'textarea'), F('notes', 'ملاحظات', 'Notes', 'textarea')
    ],
    cols: [['code', 'الرمز', 'ID', 'text'], ['action', 'الإجراء', 'Action', 'title'], ['workstream', 'مسار العمل', 'Workstream', 'text'], ['priority', 'الأولوية', 'Priority', 'prio'],
      ['status', 'الحالة', 'Status', 'status'], ['owner', 'المسؤول', 'Owner', 'owner'], ['due', 'الاستحقاق', 'Due', 'due']],
    filters: [['workstream', null], ['priority', 'priority'], ['status', 'status'], ['owner', 'owner']]
  },
  roadmap: {
    table: 'roadmap', prefix: 'roa', title: 'deliverable', statusKey: 'status', dueKey: 'due',
    ar: 'الخطة الزمنية', en: 'Roadmap',
    fields: [
      F('deliverable', 'المخرج', 'Deliverable', 'textarea', { wide: 1, required: 1 }), F('horizon', 'الأفق', 'Horizon', 'select', { e: 'horizon' }), F('workstream', 'مسار العمل', 'Workstream'),
      F('priority', 'الأولوية', 'Priority', 'select', { e: 'priority' }), F('status', 'الحالة', 'Status', 'select', { e: 'status' }),
      F('owner', 'الدور المسؤول', 'Owner role', 'select', { e: 'owner' }), F('assignee', 'المسؤول (شخص)', 'Assignee', 'user'),
      F('start', 'تاريخ البدء', 'Start', 'date'), F('due', 'تاريخ الاستحقاق', 'Due', 'date'), F('progress', 'نسبة الإنجاز %', 'Progress %', 'number', { min: 0, max: 100 }),
      F('dependency', 'الاعتمادية', 'Dependency'), F('kpi', 'مقياس النجاح', 'Success measure', 'textarea', { wide: 1 }), F('evidence', 'الأدلة/ملاحظات', 'Evidence/notes', 'textarea', { wide: 1 })
    ],
    cols: [['deliverable', 'المخرج', 'Deliverable', 'title'], ['horizon', 'الأفق', 'Horizon', 'enum:horizon'], ['workstream', 'المسار', 'Workstream', 'text'], ['status', 'الحالة', 'Status', 'status'],
      ['owner', 'المسؤول', 'Owner', 'owner'], ['due', 'الاستحقاق', 'Due', 'due'], ['progress', 'الإنجاز', 'Progress', 'pct']],
    filters: [['horizon', 'horizon'], ['workstream', null], ['status', 'status'], ['owner', 'owner']]
  },
  services: {
    table: 'services', prefix: 'ser', title: 'service', statusKey: null,
    ar: 'محفظة الخدمات', en: 'Service portfolio',
    fields: [
      F('service', 'خدمة ICS', 'ICS service', 'text', { wide: 1, required: 1 }), F('category', 'فئة ICS', 'ICS category'), F('bu', 'وحدة أعمال أوتاد', 'Awtad business unit', 'select', { e: 'bu' }),
      F('offering', 'عرض أوتاد', 'Awtad offering', 'textarea', { wide: 1 }), F('scope', 'النطاق التفصيلي', 'Detailed scope', 'textarea'), F('diff', 'الميزة التنافسية', 'Differentiator', 'textarea'),
      F('cap', 'حالة القدرة', 'Capability status', 'select', { e: 'cap' }), F('priority', 'الأولوية', 'Priority', 'select', { e: 'priority' }),
      F('owner', 'الدور المسؤول', 'Owner role', 'select', { e: 'owner' }), F('assignee', 'المسؤول (شخص)', 'Assignee', 'user'),
      F('target', 'هدف 12 شهرًا', '12-month target', 'textarea', { wide: 1 }), F('evidence', 'الدليل من ICS', 'ICS evidence', 'textarea', { wide: 1 }),
      F('url', 'رابط المصدر', 'Source URL', 'url', { wide: 1 }), F('verifiedAt', 'تاريخ آخر تحقق', 'Last verified', 'date')
    ],
    cols: [['service', 'خدمة ICS', 'ICS service', 'title'], ['category', 'الفئة', 'Category', 'text'], ['bu', 'وحدة الأعمال', 'Business unit', 'enum:bu'], ['cap', 'القدرة', 'Capability', 'cap'],
      ['priority', 'الأولوية', 'Priority', 'prio'], ['owner', 'المسؤول', 'Owner', 'owner']],
    filters: [['bu', 'bu'], ['cap', 'cap'], ['priority', 'priority'], ['category', null]]
  }
};

const KPI_DEF = [
  ['services', 'الخدمات الموثقة', 'Services documented', 'services'], ['existing', 'خدمات بقدرة قائمة', 'Services with existing capability', 'services'],
  ['certs', 'الشهادات/الأطر المتابعة', 'Certifications tracked', 'certs'], ['certsDone', 'شهادات محققة', 'Certifications achieved', 'certs'],
  ['oems', 'المصنّعون في المصفوفة', 'OEMs in matrix', 'oems'], ['oemVerified', 'مسارات شراكة مُتحقَّقة', 'Verified partner routes', 'oems'],
  ['entities', 'الجهات السعودية', 'Saudi entities', 'entities'], ['submitted', 'تسجيلات مقدمة/معلقة', 'Registrations submitted', 'entities'],
  ['approved', 'تسجيلات معتمدة/نشطة', 'Registrations approved', 'entities'], ['partners', 'شراكات نشطة', 'Active partnerships', 'oems'],
  ['docsDone', 'مستندات مكتملة/سارية', 'Documents complete', 'docs'], ['rmDone', 'مخرجات خطة مكتملة', 'Roadmap deliverables done', 'roadmap']
];
const DEF_TARGETS = { services: 40, existing: 20, certs: 25, certsDone: 12, oems: 75, oemVerified: 40, entities: 150, submitted: 30, approved: 20, partners: 15, docsDone: 44, rmDone: 37 };
const DONE = ['Approved', 'Active', 'Complete'];

// snake_case column name for a camelCase field key
const col = k => k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
const dataFields = mod => MODULES[mod].fields.filter(f => !f.group);

module.exports = { ENUM, AR, MODULES, KPI_DEF, DEF_TARGETS, DONE, col, dataFields };
