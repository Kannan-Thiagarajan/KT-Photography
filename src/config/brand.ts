export const brand = {
  name: 'KT Photography',
  tagline: 'Capturing Moments | Crafting Memories',
  phone: '+60 11-7598 2687',
  whatsapp: '601175982687',
  reference: 'https://sites.google.com/moe-dl.edu.my/ktphotographypackages/kt-photography-packages',
};
export function whatsappLink(
  text = 'Hi KT Photography! I would like to enquire about your photography packages.',
) {
  return `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(text)}`;
}
export const money = (price: number) => `RM ${new Intl.NumberFormat('en-MY').format(price)}`;
