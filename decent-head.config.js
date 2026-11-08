window.DECENT_CONFIG = {
  version: '2.0.0', appName: 'DecentInvoice', subtitle: 'Issue · review · pay',
  chain: null, ens: { enabled: false },
  theme: { accent: '#8ce5ed', 'accent-2': '#b7b4ff', 'bg-1': '#102130', 'bg-2': '#193142', 'bg-3': '#20363c' },
  about: { title: 'About DecentInvoice', summary: 'Named-payer invoices with explicit raw-unit payment and receipt review.',
    sections: [{ title: 'Safety and networks', body: 'Local preview invoices use synthetic accounts and assets only. Header wallet identity does not authorize payment. Default operations verify the configured chain and contract. The legacy fixed-address route is gated until a deployment chain is verified.' },
      { title: 'Storage unavailable', body: 'No validated invoice backup or public replication adapter exists. Selecting Pinata or Kubo is not upload success. Keep private invoice details and credentials out of public storage.' }] },
  ipfsAdapter: { version: 1, label: 'Invoice storage gates', capabilities: {},
    getStatus: async () => ({ backup: { state: 'unavailable', detail: 'Invoice backup is not implemented; provider credentials remain header-session only.' } }) },
  links: [{ label: 'Project source', url: 'https://github.com/TheJollyLaMa/DecentInvoice' }],
};
