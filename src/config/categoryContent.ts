// Long-form body copy for the pilot batch of category pages — see
// PROGRAMMATIC-SEO-VOICE.md for the voice rules this content is written to.
// Not every category has an entry; getCategoryContent() returns undefined
// for the rest, and CategoryIntro/CategoryBody render nothing in that case
// (the page looks exactly like it does today for those slugs).
//
// Keyed by the ENGLISH slug (same stable key as categories.ts). Object key
// order drives the Nav "OnlyFans Categories" dropdown and the homepage
// "Browse by category" teaser order.

export interface CategoryFaqItem {
  question: string;
  answer: string;
}

export interface CategoryContentEntry {
  intro: string[]; // 1-2 short paragraphs, rendered above the creators grid
  // "About {Category} OnlyFans" — keyword-dense definitional paragraph(s), rendered
  // as the first body section. Supports inline category links via [[Label|slug]]
  // (see src/lib/inlineCategoryLinks.ts) — unknown slugs degrade to plain text.
  about: string[];
  // Optional 1-line lead-in shown above the dynamic "Best Creators" list (which is
  // otherwise fetched live from the DB, not authored here — see TopCreators.astro).
  topCreatorsIntro?: string;
  sections: {
    heading: string;
    paragraphs: string[];
  }[]; // 2-4 narrative sections, rendered below the Best Creators list
  faq: CategoryFaqItem[]; // feeds BOTH the visible FAQ and the FAQPage JSON-LD — single source of truth
  relatedSlugs: string[]; // curated ENGLISH category slugs, hand-picked not derived
}

export interface CategoryContentPair {
  en: CategoryContentEntry;
  es: CategoryContentEntry; // separately hand-written, not machine-translated
}

export const categoryContent: Record<string, CategoryContentPair> = {
  milf: {
    en: {
      intro: [
        "Honestly MILF is one of the categories people search for the most on here, and I get why... there's just something about that older, confident energy a lot of guys are specifically hunting for instead of scrolling the whole site.",
        "This list pulls the OnlyFans creators actually getting picked as MILF right now, ranked by real engagement, not some staff pick from three years ago.",
      ],
      about: [
        "MILF — short for \"Mom I'd Like to...\" — is one of the most-searched terms in adult content generally, not just on OnlyFans. The platform has a large, genuinely active MILF creator community, made up mostly of creators in their 30s to 50s who lean into that older, confident persona on purpose. It's one of the biggest age-based categories on OnlyFans, maybe the biggest.",
        "MILF content spans pretty much every body type and content style found elsewhere on the platform, just filtered through that MILF lens. It overlaps constantly with other categories here — [[MILF Big Tits|big-tits]], [[Latina MILF|latina]], [[Ebony MILF|ebony]], [[MILF Anal|anal]], and [[MILF BBC|bbc]] all show up as natural crossovers, along with MILF amateur and stepmom-themed content that doesn't have its own page here yet. Plenty of creators lean into the mom persona directly, mixing everyday, domestic-sounding captions with content that's obviously anything but.",
      ],
      topCreatorsIntro:
        "These are the MILF creators actually leading the pack on findbyface right now, ranked by real engagement, not a hand-picked list.",
      sections: [
        {
          heading: "MILF vs. Mature — what's actually different here",
          paragraphs: [
            "So we've also got a separate Mature category, and yeah, the overlap is real... honestly there isn't some strict age cutoff where one stops and the other starts. MILF here leans more toward that specific confident, put-together vibe, where Mature is a broader net for older creators in general.",
            "If you're not sure which one you want, just check both, they're one click apart. A lot of creators genuinely show up on both lists because, again, it's not a hard line.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            "It's a mix, free accounts sitting right next to paid ones, verified badges on some profiles, and every so often a creator running a bundle deal you can grab straight from the card. Nothing's hidden behind some extra step... you see the price, you see if they're verified, and you click through.",
            "The list itself updates daily based on real engagement, favorites and subscriber activity mostly, so it's not just whoever paid for a placement (well, almost — a couple of sponsored picks do show up, but they're always tagged as an ad, never mixed in like they're organic).",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "Browsing 40 profiles at a time is fine if you've got a minute, but if you've already got a specific face in your head... honestly just upload a photo to our face search instead. It'll pull up creators who actually resemble that look, usually in under 2 seconds, no signup needed for your first couple tries.",
            "It's not gonna read minds or anything, it's a visual match, not a guarantee. But it's a lot faster than scrolling if you already know what you're after.",
          ],
        },
      ],
      faq: [
        {
          question: 'What actually counts as "MILF" on OnlyFans?',
          answer:
            "There's no official age cutoff or checkbox for it, it's more of a vibe... creators in their 30s, 40s, sometimes 50s, who lean into that confident, experienced persona on purpose. Some lean hard into the actual mom angle with captions and roleplay, others just fit the general look and energy. Both count here.",
        },
        {
          question: "What's the actual difference between MILF and Mature on here?",
          answer:
            "Mostly vibe over strict age. MILF leans toward that confident, done-with-the-nonsense energy, Mature is just a wider net for older creators in general. A bunch of accounts show up on both lists honestly, so if you're not sure, it doesn't hurt to check the Mature page too.",
        },
        {
          question: "What's the difference between MILF and stepmom content?",
          answer:
            "Stepmom is more of a specific roleplay angle, family-dynamic content built around that one scenario. MILF is broader, it's about the persona and look in general, not one storyline. A lot of stepmom creators also show up under MILF, but not every MILF creator does stepmom stuff.",
        },
        {
          question: 'Are these creators actually moms, or is MILF just a content style at this point?',
          answer:
            "Honestly it's a mix. Some creators are real moms leaning into it, some just have that look or energy and lean into the label for content reasons. We're not out here checking birth certificates or bios... the ranking is based on engagement, not life details, so treat the category as a vibe more than a verified fact.",
        },
        {
          question: 'Is MILF content more expensive than other categories?',
          answer:
            "Not really, pricing here is all over the place same as everywhere else on OnlyFans, anywhere from free to premium. Use the Free filter if budget's the main thing, or sort by price if you want to see the cheapest options first. MILF being a popular category doesn't mean it's automatically pricier.",
        },
        {
          question: 'Are the creators on this list verified?',
          answer:
            "Some are, some aren't, and we show the verified badge either way so you can tell at a glance. Verification just confirms the account is who OnlyFans says it is, it's not a quality ranking, so plenty of great unverified accounts show up here too.",
        },
        {
          question: 'How often does this list update?',
          answer:
            "Daily. New accounts, price changes, and verification status all get pulled in every 24 hours, so if someone new is blowing up this week you'll actually see them move up here, not months later.",
        },
        {
          question: 'Can I search for a specific look instead of scrolling this whole list?',
          answer:
            "Yeah, that's basically what our face search is for. Upload a photo and it'll rank creators by how close they actually look, usually in under 2 seconds. It's a ranking signal though, not proof of who anyone actually is, so treat it as a starting point.",
        },
      ],
      relatedSlugs: ['mature', 'big-tits', 'blonde', 'old-young', 'top', 'free'],
    },
    es: {
      intro: [
        'La verdad es que MILF es de las categorías más buscadas aquí, y lo entiendo... hay algo en esa energía de mujer madura y segura de sí misma que muchos buscan en específico, en vez de ponerse a scrollear todo el sitio.',
        'Esta lista junta a las creadoras de OnlyFans que la gente realmente está eligiendo como MILF ahora mismo, ordenadas por interacción real, no por algún pick de hace tres años que nadie actualizó.',
      ],
      about: [
        'MILF — abreviación de "Mom I\'d Like to..." — es uno de los términos más buscados en contenido para adultos en general, no solo en OnlyFans. La plataforma tiene una comunidad de creadoras MILF grande y realmente activa, en su mayoría creadoras de entre 30 y 50 años que se meten a propósito en esa onda madura y segura. Es una de las categorías por edad más grandes de OnlyFans, quizás la más grande.',
        'El contenido MILF cubre prácticamente todo tipo de cuerpo y estilo de contenido que existe en la plataforma, solo que filtrado con esa etiqueta MILF. Se cruza todo el tiempo con otras categorías de aquí — [[MILF Tetonas|big-tits]], [[MILF Latina|latina]], [[MILF Ebony|ebony]], [[MILF Anal|anal]] y [[MILF BBC|bbc]] aparecen como cruces naturales, junto con contenido MILF amateur y de temática stepmom que todavía no tiene su propia página aquí. Bastantes creadoras se meten directo en el personaje de mamá, mezclando frases de la vida diaria con contenido que obviamente no lo es.',
      ],
      topCreatorsIntro:
        'Estas son las creadoras MILF que realmente van a la cabeza en findbyface ahora mismo, ordenadas por interacción real, no por una lista elegida a mano.',
      sections: [
        {
          heading: 'MILF vs. Maduras — cuál es la diferencia real',
          paragraphs: [
            'También tenemos la categoría Maduras aparte, y sí, se cruzan bastante... la verdad no hay una edad exacta donde termina una y empieza la otra. MILF aquí es más por esa onda segura, arreglada, mientras que Maduras es una red más amplia para creadoras mayores en general.',
            'Si no sabes cuál te conviene más, revisa las dos, están a un clic de distancia. Muchas creadoras de hecho aparecen en ambas listas porque, otra vez, no es una línea tan clara.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Es una mezcla, cuentas gratis al lado de cuentas de pago, algunas con insignia de verificadas, y de vez en cuando alguna creadora con un pack en oferta que puedes ver directo en la tarjeta. Nada está escondido detrás de otro paso extra... ves el precio, ves si está verificada, y le das clic.',
            'La lista se actualiza a diario según interacción real, favoritos y actividad de suscriptores sobre todo, así que no es solo quien pagó por aparecer (bueno, casi... sí hay algunos picks patrocinados, pero siempre están marcados como anuncio, nunca mezclados como si fueran orgánicos).',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Ver 40 perfiles a la vez está bien si tienes un rato, pero si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos, sin necesidad de registrarte para tus primeras búsquedas.',
            'No es que lea mentes ni nada de eso, es una coincidencia visual, no una garantía. Pero es bastante más rápido que scrollear si ya sabes lo que buscas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Qué cuenta realmente como "MILF" en OnlyFans?',
          answer:
            'No hay una edad oficial ni una casilla que marcar, es más una onda... creadoras de 30, 40, a veces 50 años, que se meten a propósito en esa energía segura y con experiencia. Algunas se van directo al personaje de mamá con frases y roleplay, otras simplemente tienen ese look y esa energía. Las dos cuentan aquí.',
        },
        {
          question: '¿Cuál es la diferencia real entre MILF y Maduras aquí?',
          answer:
            'Es más por onda que por edad exacta. MILF va más por esa energía segura, arreglada, y Maduras es una red más amplia para creadoras mayores en general. Bastantes cuentas aparecen en las dos listas, así que si no estás seguro, no cuesta nada revisar también Maduras.',
        },
        {
          question: '¿Cuál es la diferencia entre MILF y contenido de stepmom?',
          answer:
            'Stepmom es más un ángulo de roleplay específico, contenido armado alrededor de esa dinámica familiar. MILF es más amplio, es sobre el personaje y el look en general, no una sola historia. Muchas creadoras de stepmom también aparecen en MILF, pero no todas las creadoras MILF hacen contenido de stepmom.',
        },
        {
          question: '¿Estas creadoras son mamás de verdad o MILF ya es más un estilo de contenido?',
          answer:
            'Honestamente es una mezcla. Algunas sí son mamás de verdad que se meten en esa onda, otras simplemente tienen ese look o esa energía y usan la etiqueta por el contenido. Aquí no andamos revisando actas de nacimiento ni biografías... el ranking se basa en interacción, no en datos de vida, así que trátalo más como una vibra que como un dato verificado.',
        },
        {
          question: '¿El contenido MILF es más caro que otras categorías?',
          answer:
            'No realmente, los precios aquí varían igual que en el resto de OnlyFans, desde gratis hasta premium. Usa el filtro Gratis si el presupuesto es lo principal, o ordena por precio si quieres ver primero las opciones más baratas. Que MILF sea una categoría popular no la hace automáticamente más cara.',
        },
        {
          question: '¿Las creadoras de esta lista están verificadas?',
          answer:
            'Algunas sí, otras no, y mostramos la insignia de verificación en ambos casos para que lo veas de un vistazo. Verificada solo confirma que la cuenta es quien dice ser en OnlyFans, no es una calificación de calidad, así que aquí también aparecen muy buenas cuentas sin verificar.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer:
            'A diario. Cuentas nuevas, cambios de precio y estado de verificación se actualizan cada 24 horas, así que si alguien está explotando esta semana, lo vas a ver subir aquí, no meses después.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de ver toda la lista?',
          answer:
            'Sí, para eso está básicamente nuestra búsqueda facial. Subes una foto y te muestra creadoras ordenadas por qué tanto se parecen, normalmente en menos de 2 segundos. Eso sí, es una señal de similitud, no prueba de quién es realmente alguien, así que tómalo como punto de partida.',
        },
      ],
      relatedSlugs: ['mature', 'big-tits', 'blonde', 'old-young', 'top', 'free'],
    },
  },

  top: {
    en: {
      intro: [
        "Top is basically the whole site condensed into one list... whoever's actually popping off across every category right now, not just one niche. If you don't know exactly what you're into yet, this is honestly the best place to start.",
        "No editor sat down and picked these names either, it's pulled straight from real engagement across the whole platform, updated daily.",
      ],
      about: [
        "\"Top OnlyFans\" is one of the broadest searches in this whole space, people looking for whoever's most popular right now without narrowing it down to a specific type, body, or niche first. It's less a content category and more a leaderboard, pulling from every corner of the platform at once.",
        "Because it's not filtered by niche, you'll see everything show up here depending on the week — [[MILF|milf]] creators next to [[Latina|latina]] creators next to someone who's mostly [[Big Tits|big-tits]] content, [[Blonde|blonde]] creators mixed in with [[Free|free]] accounts that happen to be blowing up. The one thing they all have in common is real, current engagement, not a fixed type of content.",
      ],
      topCreatorsIntro:
        'These are the creators leading the entire site right now, not just one category, ranked by real engagement across all of OnlyFans.',
      sections: [
        {
          heading: "How 'Top' actually gets decided",
          paragraphs: [
            "This one gets the most side-eye honestly, because \"top\" sounds like it could mean anything... paid placement, some editor's personal picks, whatever. It's none of that here. The ranking pulls from real engagement signals, favorites and subscriber activity mostly, the same exact system that ranks every other category on the site.",
            "So yeah, there's no human sitting there swapping names around based on vibes. If someone's genuinely popping off this week, you'll see them move up here, and if someone drops off, they drop off the list too. (A couple of sponsored spots do show up sometimes, but those are always tagged as an ad, never folded in like they're organic.)",
          ],
        },
        {
          heading: "Why start here if you're not sure what you're into",
          paragraphs: [
            "If you're newer to OnlyFans or just don't have a specific type locked in yet, honestly Top is probably the easiest entry point on the whole site. You're not committing to one niche, you're just seeing who's actually resonating with people right now across the board.",
            "It's also just a good gut-check for the rest of the site... browse Top for a bit, notice what you keep clicking on, and that'll usually point you toward whichever category actually matches what you're into.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "Scrolling a mixed list like this is fun if you've got time to kill, but if you've already got a specific face in mind... honestly just upload a photo to our face search instead. It'll skip the browsing entirely and pull up creators who actually resemble that look, usually in under 2 seconds.",
            "It's a visual match, not a guarantee obviously, but it's a lot faster than scrolling a general list if you already know what you're after.",
          ],
        },
      ],
      faq: [
        {
          question: 'How is the Top list actually decided?',
          answer:
            "Real engagement, mainly favorites and subscriber activity pulled straight from OnlyFans. There's no editor picking favorites... if the numbers move, the list moves. Refreshed daily, so it stays current instead of stale.",
        },
        {
          question: 'Is Top just paid placement?',
          answer:
            "No, the organic ranking here is 100% engagement-based. We do run a small number of sponsored spots sometimes, but they're always labeled \"Ad\" on the card, never mixed in like they earned the spot organically.",
        },
        {
          question: "What's the difference between Top and Models?",
          answer:
            "Honestly there's overlap, but Top is the broadest possible list across every category, Models leans specifically toward that polished, professional-model aesthetic. If you want literally the most popular right now regardless of look, Top's the one.",
        },
        {
          question: 'Does Top include free creators too?',
          answer:
            "Yeah, it's mixed, free and paid sit right next to each other here since the ranking is about engagement, not price. Use the Free filter if you want to narrow it down to $0-subscribe accounts only.",
        },
        {
          question: 'How often does this list change?',
          answer:
            "Daily. It's genuinely one of the more volatile lists on the site since it's pulling from the whole platform, so creators can move up or drop off pretty fast compared to a narrower category.",
        },
        {
          question: 'Are all these creators verified?',
          answer:
            "Some are, some aren't, we show the badge either way. Verification just confirms the account is legit on OnlyFans, it's not part of the ranking itself.",
        },
        {
          question: 'Can I search for a specific look instead of browsing this list?',
          answer:
            "Yeah, that's what our face search is for. Upload a photo and it'll rank creators by how close they actually look, usually in under 2 seconds. Ranking signal, not proof of identity, but a solid starting point.",
        },
      ],
      relatedSlugs: ['free', 'models', 'milf', 'big-tits', 'blonde', 'latina'],
    },
    es: {
      intro: [
        'Top básicamente es todo el sitio resumido en una sola lista... quien esté pegando fuerte en cualquier categoría ahora mismo, no solo en un nicho. Si todavía no sabes bien qué te gusta, honestamente este es el mejor lugar para empezar.',
        'Aquí tampoco hay ningún editor eligiendo nombres a mano, todo sale directo de interacción real en toda la plataforma, actualizado a diario.',
      ],
      about: [
        '"Top OnlyFans" es una de las búsquedas más amplias en todo este espacio, gente buscando quien sea más popular ahora mismo sin filtrar primero por tipo, cuerpo o nicho. Es menos una categoría de contenido y más una tabla de posiciones, que junta cosas de toda la plataforma a la vez.',
        'Como no está filtrado por nicho, vas a ver de todo aquí dependiendo de la semana — creadoras [[MILF|milf]] al lado de creadoras [[Latinas|latina]] al lado de alguien que hace sobre todo contenido [[Tetonas|big-tits]], creadoras [[Rubias|blonde]] mezcladas con cuentas [[Gratis|free]] que resulta que están explotando. Lo único que tienen en común es interacción real y actual, no un tipo de contenido fijo.',
      ],
      topCreatorsIntro:
        'Estas son las creadoras que van a la cabeza de todo el sitio ahora mismo, no de una sola categoría, ordenadas por interacción real en todo OnlyFans.',
      sections: [
        {
          heading: 'Cómo se decide realmente el Top',
          paragraphs: [
            'Esta es la que más dudas genera honestamente, porque "top" suena a que podría significar cualquier cosa... colocación pagada, picks personales de algún editor, lo que sea. Aquí no es nada de eso. El ranking sale de señales de interacción real, favoritos y actividad de suscriptores sobre todo, el mismo sistema que ordena todas las demás categorías del sitio.',
            "O sea que no hay ninguna persona moviendo nombres según le parezca. Si alguien está pegando fuerte esta semana, la vas a ver subir aquí, y si alguien baja, también baja de la lista. (Sí aparecen algunos espacios patrocinados de vez en cuando, pero siempre están marcados como anuncio, nunca mezclados como si fueran orgánicos.)",
          ],
        },
        {
          heading: 'Por qué empezar aquí si no sabes bien qué te gusta',
          paragraphs: [
            'Si eres nuevo en OnlyFans o simplemente no tienes un tipo específico definido todavía, honestamente Top es probablemente el punto de entrada más fácil de todo el sitio. No te estás comprometiendo con un nicho, solo estás viendo quién realmente está conectando con la gente ahora mismo en general.',
            'También es una buena forma de orientarte en el resto del sitio... navega el Top un rato, fíjate en qué le das clic más seguido, y eso normalmente te va a llevar a la categoría que realmente te gusta.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Ver una lista mezclada como esta está bien si tienes tiempo libre, pero si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial. Te saltas todo el scroll y te muestra creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Es una coincidencia visual, no una garantía obviamente, pero es bastante más rápido que scrollear una lista general si ya sabes lo que buscas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cómo se decide realmente la lista Top?',
          answer:
            'Interacción real, sobre todo favoritos y actividad de suscriptores sacada directo de OnlyFans. No hay ningún editor eligiendo favoritas... si los números se mueven, la lista se mueve. Se actualiza a diario, así que se mantiene actual y no desactualizada.',
        },
        {
          question: '¿Top es solo colocación pagada?',
          answer:
            'No, el ranking orgánico aquí es 100% basado en interacción. Sí manejamos algunos espacios patrocinados de vez en cuando, pero siempre están marcados como "Anuncio" en la tarjeta, nunca mezclados como si se hubieran ganado el lugar de forma orgánica.',
        },
        {
          question: '¿Cuál es la diferencia entre Top y Modelos?',
          answer:
            'Honestamente se cruzan, pero Top es la lista más amplia posible en todas las categorías, Modelos va más hacia esa estética pulida y profesional. Si quieres literalmente lo más popular ahora mismo sin importar el look, Top es la categoría.',
        },
        {
          question: '¿Top incluye creadoras gratis también?',
          answer:
            'Sí, está mezclado, cuentas gratis y de pago están una al lado de la otra aquí porque el ranking es por interacción, no por precio. Usa el filtro Gratis si quieres ver solo cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto cambia esta lista?',
          answer:
            'A diario. Es honestamente una de las listas más cambiantes del sitio porque saca de toda la plataforma, así que las creadoras pueden subir o bajar bastante rápido comparado con una categoría más específica.',
        },
        {
          question: '¿Todas estas creadoras están verificadas?',
          answer:
            'Algunas sí, otras no, mostramos la insignia en ambos casos. Verificada solo confirma que la cuenta es legítima en OnlyFans, no forma parte del ranking en sí.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar esta lista?',
          answer:
            'Sí, para eso está nuestra búsqueda facial. Subes una foto y ordena a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos. Es una señal de similitud, no prueba de identidad, pero es un buen punto de partida.',
        },
      ],
      relatedSlugs: ['free', 'models', 'milf', 'big-tits', 'blonde', 'latina'],
    },
  },

  free: {
    en: {
      intro: [
        "Free is exactly what it sounds like, $0-subscribe OnlyFans creators, no catch buried in the fine print. It's honestly one of the most searched categories on here for obvious reasons... why pay if you don't have to yet.",
        "This list pulls whoever's actually offering free subscriptions right now, ranked by real engagement, not just whoever happened to flip the free switch most recently.",
      ],
      about: [
        "\"Free OnlyFans\" is one of the highest-intent searches in this whole space, people specifically looking for creators who don't charge a subscription fee at all. It's not a niche in the content sense, more a pricing filter layered on top of every other category on the site.",
        "Free doesn't mean lower effort either, plenty of [[MILF|milf]], [[Latina|latina]], and [[BBW|bbw]] creators run completely free pages and still post regularly, sometimes making their money instead through tips, PPV messages, or bundle upsells once you're already subscribed. Worth knowing going in so \"free\" doesn't feel like a bait-and-switch.",
      ],
      topCreatorsIntro:
        'These are the free-to-subscribe creators actually leading the pack right now, ranked by real engagement.',
      sections: [
        {
          heading: "Is 'free' actually free?",
          paragraphs: [
            "Yeah, subscribing itself costs $0, that part's real and it's pulled live from OnlyFans, not something we're guessing at. What's worth knowing though is that a creator can flip their price at literally any time, so free today doesn't guarantee free next month.",
            "Free also doesn't mean nothing ever costs money. A lot of free creators make their actual income through tips, pay-per-view messages, or bundle deals, the subscription itself is just the door, not necessarily everything behind it.",
          ],
        },
        {
          heading: "Free doesn't mean lower quality",
          paragraphs: [
            "Honestly it's easy to assume free means less effort, but that's not really how it plays out here. Plenty of free creators post just as consistently as paid ones, some even more, because the free tier is basically their way of building a bigger audience first.",
            "You'll see the same range of verified badges, content styles, and posting frequency on this list as anywhere else on the site, price just isn't the thing separating quality here.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "Free is a great filter if budget's the main thing, but if you've already got a specific face in mind... honestly just upload a photo to our face search instead. It'll pull up creators who actually resemble that look, usually in under 2 seconds, and you can still combine it with the Free filter after.",
            "Not a guarantee, it's a visual match not identity verification, but it beats scrolling if you know exactly what you're after.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is this list actually free, or is there a catch?',
          answer:
            "The subscription itself is genuinely $0, pulled live from OnlyFans pricing, not something we estimate. The catch, if there is one, is usually tips or PPV messages on top, not a hidden subscription fee.",
        },
        {
          question: 'Can a free creator start charging later?',
          answer:
            "Yep, anytime. Creators can change their price whenever they want, so this list can shift day to day. That's exactly why it's refreshed daily instead of being some static page from months ago.",
        },
        {
          question: 'Does free mean lower-quality content?',
          answer:
            "Not really, no. Plenty of free creators post just as much as paid ones, sometimes more, since the free tier is often how they grow their audience first. Price and effort aren't really linked here.",
        },
        {
          question: 'How do free creators actually make money then?',
          answer:
            "Mostly tips and pay-per-view messages, sometimes bundle deals too. The $0 subscription gets you in the door, what happens after that varies creator to creator.",
        },
        {
          question: 'Are free creators on this list verified?',
          answer:
            "Some are, some aren't, we show the badge either way so you can tell at a glance. Verification and price are completely separate things here.",
        },
        {
          question: 'How often does this list update?',
          answer:
            "Daily. Prices, new accounts, and verification status all get pulled in every 24 hours, so it should reflect what's actually free right now, not last month.",
        },
        {
          question: 'Can I combine Free with a specific look I\'m searching for?',
          answer:
            "Yeah, upload a photo to our face search and it'll rank creators by how close they look to it, usually in under 2 seconds. It's a ranking signal, not proof of who anyone is, but it's a faster starting point than scrolling.",
        },
      ],
      relatedSlugs: ['top', 'models', 'milf', 'blonde', 'latina', 'bbw'],
    },
    es: {
      intro: [
        'Gratis es exactamente lo que suena, creadoras de OnlyFans con suscripción de $0, sin truco escondido en la letra chica. Es honestamente una de las categorías más buscadas aquí por razones obvias... para qué pagar si todavía no hace falta.',
        'Esta lista junta a quien realmente está ofreciendo suscripción gratis ahora mismo, ordenada por interacción real, no por quien activó el modo gratis más recientemente.',
      ],
      about: [
        '"OnlyFans gratis" es una de las búsquedas con más intención de todo este espacio, gente buscando específicamente creadoras que no cobran nada por la suscripción. No es un nicho de contenido en sí, es más un filtro de precio que se aplica sobre todas las demás categorías del sitio.',
        'Gratis tampoco significa menos esfuerzo, bastantes creadoras [[MILF|milf]], [[Latinas|latina]] y [[BBW|bbw]] manejan páginas completamente gratis y siguen publicando seguido, a veces generando ingresos con propinas, mensajes PPV o packs una vez que ya estás suscrito. Vale la pena saberlo para que "gratis" no se sienta como un engaño.',
      ],
      topCreatorsIntro:
        'Estas son las creadoras gratis que realmente van a la cabeza ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: '¿Es realmente gratis?',
          paragraphs: [
            'Sí, suscribirte cuesta $0, esa parte es real y sale directo de OnlyFans, no es algo que estemos adivinando. Lo que sí vale la pena saber es que una creadora puede cambiar su precio en cualquier momento, así que gratis hoy no garantiza gratis el próximo mes.',
            'Gratis tampoco significa que nunca vas a gastar nada. Muchas creadoras gratis generan sus ingresos reales con propinas, mensajes de pago por ver o packs, la suscripción es solo la puerta de entrada, no necesariamente todo lo que hay detrás.',
          ],
        },
        {
          heading: 'Gratis no significa menor calidad',
          paragraphs: [
            'Honestamente es fácil asumir que gratis significa menos esfuerzo, pero no es realmente así aquí. Bastantes creadoras gratis publican tan seguido como las de pago, algunas hasta más, porque el nivel gratis es básicamente su forma de construir una audiencia más grande primero.',
            'Vas a ver el mismo rango de insignias de verificación, estilos de contenido y frecuencia de publicación en esta lista que en cualquier otra parte del sitio, el precio no es lo que separa la calidad aquí.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Gratis es un buen filtro si el presupuesto es lo principal, pero si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos, y después puedes combinarlo con el filtro Gratis.',
            'No es garantía, es una coincidencia visual, no verificación de identidad, pero es mejor que scrollear si ya sabes lo que buscas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Esta lista es realmente gratis o hay truco?',
          answer:
            'La suscripción en sí es de verdad $0, sacada directo del precio en OnlyFans, no es algo que estimemos. El truco, si lo hay, normalmente son las propinas o mensajes PPV extra, no una cuota de suscripción escondida.',
        },
        {
          question: '¿Una creadora gratis puede empezar a cobrar después?',
          answer:
            'Sí, en cualquier momento. Las creadoras pueden cambiar su precio cuando quieran, así que esta lista puede cambiar de un día para otro. Por eso mismo se actualiza a diario en vez de ser una página estática de hace meses.',
        },
        {
          question: '¿Gratis significa contenido de menor calidad?',
          answer:
            'La verdad no. Bastantes creadoras gratis publican tanto como las de pago, a veces más, porque el nivel gratis suele ser su forma de hacer crecer la audiencia primero. Precio y esfuerzo no van realmente de la mano aquí.',
        },
        {
          question: '¿Entonces cómo ganan dinero las creadoras gratis?',
          answer:
            'Sobre todo con propinas y mensajes de pago por ver, a veces también packs. La suscripción de $0 te deja entrar, lo que pasa después varía de creadora a creadora.',
        },
        {
          question: '¿Las creadoras gratis de esta lista están verificadas?',
          answer:
            'Algunas sí, otras no, mostramos la insignia en ambos casos para que lo veas de un vistazo. Verificación y precio son cosas completamente separadas aquí.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer:
            'A diario. Precios, cuentas nuevas y estado de verificación se actualizan cada 24 horas, así que debería reflejar lo que es gratis ahora mismo, no lo que era el mes pasado.',
        },
        {
          question: '¿Puedo combinar Gratis con una cara específica que estoy buscando?',
          answer:
            'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos. Es una señal de similitud, no prueba de quién es alguien, pero es un punto de partida más rápido que scrollear.',
        },
      ],
      relatedSlugs: ['top', 'models', 'milf', 'blonde', 'latina', 'bbw'],
    },
  },

  feet: {
    en: {
      intro: [
        "Feet is honestly one of the biggest fetish categories on OnlyFans, not some tiny niche corner... it's mainstream at this point, ya know. If that's your thing, there's a genuinely deep list here, not just a handful of accounts with a foot pic thrown in.",
        "This list pulls creators actually posting feet-focused content right now, ranked by real engagement, not just whoever tagged themselves that way once.",
      ],
      about: [
        "\"Feet OnlyFans\" covers exactly what it sounds like, content centered on feet, soles, toes, that kind of thing, usually photos and videos, sometimes custom requests. It's genuinely one of the most consistently searched fetish terms in adult content, foot fetish content has been mainstream for a long time, this isn't some fringe request anymore.",
        "Worth knowing there's a separate [[Footjob|footjob]] category here too, that one's about the actual act, Feet is more about the photo/video content itself. A lot of creators do both and cross-list, but they're not the same thing, so check whichever one actually matches what you're after.",
      ],
      topCreatorsIntro: 'These are the feet creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Feet vs. Footjob — worth knowing the difference',
          paragraphs: [
            "Quick clarification since these two get mixed up a lot... Feet is about photo and video content of feet themselves, Footjob is specifically about the act. Some creators do both, plenty only do one or the other, so it's worth checking the right category instead of assuming.",
            "If a creator's page is mostly soles and toe pics with the occasional custom request, that's Feet. If it's specifically that one act, that's Footjob. Not a hard rule, just the general split you'll notice browsing.",
          ],
        },
        {
          heading: 'Custom requests are a big part of this niche',
          paragraphs: [
            "Feet content leans custom more than a lot of other categories, honestly. A ton of creators here do paid custom requests on top of their regular posts, specific angles, specific things, whatever you're into. Worth checking a creator's bio or messaging them directly if that's what you want, since it's not always obvious from the profile grid alone.",
            "Pricing varies a lot too because of that, some accounts are cheap and mostly photo-dump style, others are pricier because customs are basically their whole business model.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "Our face search is built around faces, not feet, so it won't help you narrow down by foot type specifically, just being upfront about that. What it can do is help if you've got a specific creator's face in mind and want to check if they're on here or find someone who looks similar.",
            'Otherwise honestly just browsing this list and checking bios for custom-request info is the more direct route for feet-specific stuff.',
          ],
        },
      ],
      faq: [
        {
          question: "What counts as 'feet' content on OnlyFans?",
          answer:
            "Mostly photos and videos of feet, soles, toes, that kind of thing, plus a lot of creators offering custom requests on top. It's less one specific format and more a whole content category built around that focus.",
        },
        {
          question: "What's the difference between Feet and Footjob here?",
          answer:
            "Feet is about photo/video content of feet themselves, Footjob is specifically about that one act. They overlap since plenty of creators do both, but they're separate categories here so you can find exactly what you're after.",
        },
        {
          question: 'Do most feet creators do custom requests?',
          answer:
            "A lot of them, yeah, it's a pretty common part of this niche. Not universal though, so check a creator's bio or message them directly if that's specifically what you're looking for.",
        },
        {
          question: 'Is feet content usually expensive?',
          answer:
            'Varies a lot honestly. Some accounts are cheap, mostly regular posts, others charge more because customs are basically their main offering. Use the Free filter if budget\'s the priority, or check pricing per profile.',
        },
        {
          question: 'Are these creators verified?',
          answer:
            "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking, it just confirms the account is legit on OnlyFans.",
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, same as every category here. New accounts, pricing, and verification all refresh every 24 hours.',
        },
        {
          question: 'Can face search help me find feet content specifically?',
          answer:
            "Not really, it matches faces, not feet, so it's more useful if you're trying to find a specific creator or someone who looks like them. For feet-specific stuff, browsing this list directly is the better route.",
        },
      ],
      relatedSlugs: ['footjob', 'bondage', 'models', 'top', 'free'],
    },
    es: {
      intro: [
        'Pies es honestamente una de las categorías de fetiche más grandes en OnlyFans, no es un rincón chiquito de nicho... a estas alturas es prácticamente mainstream. Si eso es lo tuyo, aquí hay una lista bastante completa, no solo un puñado de cuentas con una foto de pies de relleno.',
        'Esta lista junta a creadoras que realmente publican contenido enfocado en pies ahora mismo, ordenada por interacción real, no por quien se etiquetó así una vez.',
      ],
      about: [
        '"Pies OnlyFans" cubre exactamente lo que suena, contenido centrado en pies, plantas, dedos, ese tipo de cosas, normalmente fotos y videos, a veces contenido personalizado. Es honestamente uno de los términos de fetiche más buscados de forma constante en contenido para adultos, el fetiche de pies lleva mucho tiempo siendo mainstream, no es para nada algo marginal.',
        'Vale la pena saber que también existe una categoría separada de [[Footjob|footjob]] aquí, esa es sobre el acto en sí, Pies es más sobre el contenido de foto/video en sí mismo. Muchas creadoras hacen ambas cosas y se cruzan, pero no son lo mismo, así que revisa la que realmente coincida con lo que buscas.',
      ],
      topCreatorsIntro: 'Estas son las creadoras de pies que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Pies vs. Footjob — vale la pena saber la diferencia',
          paragraphs: [
            'Aclaración rápida porque estas dos se confunden seguido... Pies es sobre contenido de foto y video de los pies en sí, Footjob es específicamente sobre el acto. Algunas creadoras hacen ambas cosas, muchas solo una, así que vale la pena revisar la categoría correcta en vez de asumir.',
            'Si la página de una creadora es sobre todo fotos de plantas y dedos con algún que otro personalizado, eso es Pies. Si es específicamente ese acto, eso es Footjob. No es una regla fija, solo la división general que vas a notar navegando.',
          ],
        },
        {
          heading: 'Los pedidos personalizados son una gran parte de este nicho',
          paragraphs: [
            'El contenido de pies se inclina más hacia lo personalizado que muchas otras categorías, honestamente. Bastantes creadoras aquí hacen pedidos personalizados de pago además de sus publicaciones normales, ángulos específicos, cosas específicas, lo que sea que te guste. Vale la pena revisar la bio de la creadora o escribirle directo si eso es lo que buscas, porque no siempre es obvio solo viendo la cuadrícula del perfil.',
            'Los precios también varían mucho por eso, algunas cuentas son baratas y más tipo galería de fotos, otras son más caras porque los personalizados son básicamente su modelo de negocio principal.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Nuestra búsqueda facial está armada para caras, no para pies, así que no te va a ayudar a filtrar por tipo de pie específicamente, siendo honestos con eso. Lo que sí puede hacer es ayudarte si ya tienes la cara de una creadora en mente y quieres ver si está aquí o encontrar a alguien parecida.',
            'Fuera de eso, honestamente navegar esta lista y revisar las bios buscando info de personalizados es la ruta más directa para contenido específico de pies.',
          ],
        },
      ],
      faq: [
        {
          question: "¿Qué cuenta como contenido de 'pies' en OnlyFans?",
          answer:
            'Sobre todo fotos y videos de pies, plantas, dedos, ese tipo de cosas, más muchas creadoras que ofrecen pedidos personalizados además. Es menos un formato específico y más toda una categoría de contenido armada alrededor de ese enfoque.',
        },
        {
          question: '¿Cuál es la diferencia entre Pies y Footjob aquí?',
          answer:
            'Pies es sobre contenido de foto/video de los pies en sí, Footjob es específicamente sobre ese acto. Se cruzan porque muchas creadoras hacen ambas cosas, pero son categorías separadas aquí para que encuentres exactamente lo que buscas.',
        },
        {
          question: '¿La mayoría de las creadoras de pies hacen pedidos personalizados?',
          answer:
            'Bastantes sí, honestamente es una parte bastante común de este nicho. No es universal eso sí, así que revisa la bio de la creadora o escríbele directo si eso es específicamente lo que buscas.',
        },
        {
          question: '¿El contenido de pies suele ser caro?',
          answer:
            'Varía mucho la verdad. Algunas cuentas son baratas, sobre todo publicaciones normales, otras cobran más porque los personalizados son básicamente su oferta principal. Usa el filtro Gratis si el presupuesto es lo prioritario, o revisa el precio por perfil.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking, solo confirma que la cuenta es legítima en OnlyFans.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, igual que todas las categorías aquí. Cuentas nuevas, precios y verificación se actualizan cada 24 horas.',
        },
        {
          question: '¿La búsqueda facial me puede ayudar a encontrar contenido de pies específicamente?',
          answer:
            'La verdad no mucho, compara caras, no pies, así que es más útil si estás buscando una creadora específica o a alguien parecida. Para contenido específico de pies, navegar esta lista directamente es la mejor ruta.',
        },
      ],
      relatedSlugs: ['footjob', 'bondage', 'models', 'top', 'free'],
    },
  },

  trans: {
    en: {
      intro: [
        "Trans is one of the more established categories on OnlyFans, honestly a huge and active community of creators with a real dedicated following, not some small side category. If that's specifically what you're looking for, there's a genuinely deep list here.",
        'This list pulls trans creators actually getting real engagement right now, ranked the same way every other category is, no separate rules for this one.',
      ],
      about: [
        "\"Trans OnlyFans\" covers content from transgender creators, and it's genuinely one of the biggest, most active communities on the platform, not a small corner of it. Creators here span the same range you'd see anywhere else on OnlyFans, different styles, different pricing, different levels of activity, the trans label is about who's creating the content, not one specific type of content.",
        'It crosses over with plenty of other categories here too depending on the creator, [[MILF|milf]] and [[Latina|latina]] trans creators both show up regularly, for example. Worth browsing broadly instead of assuming it\'s one narrow lane.',
      ],
      topCreatorsIntro: 'These are the trans creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A genuinely large, active community',
          paragraphs: [
            "Trans creators have honestly built one of the most loyal fanbases on OnlyFans, it's not a fringe category at all at this point. You'll find the same range here you'd find anywhere else on the site... different content styles, different personalities, different price points, all ranked the exact same way as every other category.",
            'Nothing about this list works differently behind the scenes either, same engagement-based ranking, same daily refresh, no separate treatment.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            "It's a mix, free accounts next to paid ones, verified badges on some profiles, bundle deals showing up here and there same as anywhere else on the site. Prices and content styles vary creator to creator, there's no single format that defines the category.",
            'A couple of sponsored spots can show up too, always tagged clearly as an ad, never blended in with the organic ranking.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds, no signup needed for your first couple tries.",
            "It's a visual match, not a guarantee, but it's a faster starting point than browsing if you already know what you're after.",
          ],
        },
      ],
      faq: [
        {
          question: 'How is this list ranked?',
          answer:
            'Same as every category on the site, real engagement, favorites and subscriber activity pulled live from OnlyFans. No separate rules or manual curation for this category specifically.',
        },
        {
          question: 'Are these creators verified?',
          answer:
            "Some are, some aren't, we show the badge either way so you can tell at a glance. Verification just confirms the account is legit on OnlyFans, it's separate from the ranking itself.",
        },
        {
          question: 'Is everything on this list free?',
          answer: "No, it's a mix, free and paid accounts sit right next to each other. Use the Free filter if you specifically want $0-subscribe accounts.",
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, price changes, and verification status all refresh every 24 hours, so it stays current.',
        },
        {
          question: 'Does this category overlap with others, like MILF or Latina?',
          answer:
            "Yeah, plenty. Trans creators show up across a lot of other categories here too depending on their content and background, it's not one narrow lane, worth browsing broadly.",
        },
        {
          question: 'Can I search for a specific look instead of scrolling this list?',
          answer:
            "Yeah, that's what our face search is for. Upload a photo and it'll rank creators by how close they actually look, usually in under 2 seconds. It's a ranking signal, not proof of identity, but a solid starting point.",
        },
        {
          question: 'Are sponsored profiles mixed into this list?',
          answer:
            "A few spots can be sponsored, but they're always clearly labeled \"Ad\" on the card. The rest of the ranking is fully organic, based on real engagement.",
        },
      ],
      relatedSlugs: ['milf', 'latina', 'models', 'top', 'free'],
    },
    es: {
      intro: [
        'Trans es una de las categorías más consolidadas de OnlyFans, honestamente una comunidad enorme y activa de creadoras con un público fiel de verdad, no es una categoría secundaria pequeña. Si eso es específicamente lo que buscas, aquí hay una lista bastante completa.',
        'Esta lista junta a creadoras trans que realmente tienen interacción real ahora mismo, ordenada de la misma forma que todas las demás categorías, sin reglas aparte para esta.',
      ],
      about: [
        '"Trans OnlyFans" cubre contenido de creadoras transgénero, y es honestamente una de las comunidades más grandes y activas de la plataforma, no un rincón pequeño. Las creadoras aquí abarcan el mismo rango que verías en cualquier otra parte de OnlyFans, distintos estilos, distintos precios, distintos niveles de actividad, la etiqueta trans es sobre quién crea el contenido, no un tipo específico de contenido.',
        'También se cruza con bastantes otras categorías de aquí dependiendo de la creadora, creadoras trans [[MILF|milf]] y [[Latinas|latina]] aparecen seguido, por ejemplo. Vale la pena navegar en general en vez de asumir que es un solo carril angosto.',
      ],
      topCreatorsIntro: 'Estas son las creadoras trans que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una comunidad realmente grande y activa',
          paragraphs: [
            'Las creadoras trans honestamente han construido una de las bases de fans más fieles de OnlyFans, para nada es una categoría marginal a estas alturas. Vas a encontrar el mismo rango aquí que en cualquier otra parte del sitio... distintos estilos de contenido, distintas personalidades, distintos precios, todo ordenado exactamente igual que las demás categorías.',
            'Tampoco hay nada que funcione diferente detrás de cámaras, el mismo ranking basado en interacción, la misma actualización diaria, sin trato aparte.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Es una mezcla, cuentas gratis al lado de cuentas de pago, algunas con insignia de verificadas, packs apareciendo aquí y allá igual que en el resto del sitio. Los precios y estilos de contenido varían de creadora a creadora, no hay un formato único que defina la categoría.',
            'También pueden aparecer algunos espacios patrocinados, siempre marcados claramente como anuncio, nunca mezclados con el ranking orgánico.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos, sin necesidad de registrarte para tus primeras búsquedas.',
            'Es una coincidencia visual, no una garantía, pero es un punto de partida más rápido que navegar si ya sabes lo que buscas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cómo se ordena esta lista?',
          answer:
            'Igual que todas las categorías del sitio, interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans. Sin reglas aparte ni curación manual para esta categoría en específico.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer:
            'Algunas sí, otras no, mostramos la insignia en ambos casos para que lo veas de un vistazo. Verificada solo confirma que la cuenta es legítima en OnlyFans, es algo separado del ranking en sí.',
        },
        {
          question: '¿Todo en esta lista es gratis?',
          answer: 'No, es una mezcla, cuentas gratis y de pago están una al lado de la otra. Usa el filtro Gratis si específicamente quieres cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, cambios de precio y estado de verificación se actualizan cada 24 horas, así que se mantiene al día.',
        },
        {
          question: '¿Esta categoría se cruza con otras, como MILF o Latina?',
          answer:
            'Sí, bastante. Las creadoras trans aparecen también en muchas otras categorías de aquí dependiendo de su contenido y perfil, no es un solo carril angosto, vale la pena navegar en general.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar esta lista?',
          answer:
            'Sí, para eso está nuestra búsqueda facial. Subes una foto y ordena a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos. Es una señal de similitud, no prueba de identidad, pero es un buen punto de partida.',
        },
        {
          question: '¿Hay perfiles patrocinados mezclados en esta lista?',
          answer:
            'Algunos espacios pueden ser patrocinados, pero siempre están marcados claramente como "Anuncio" en la tarjeta. El resto del ranking es totalmente orgánico, basado en interacción real.',
        },
      ],
      relatedSlugs: ['milf', 'latina', 'models', 'top', 'free'],
    },
  },

  bbw: {
    en: {
      intro: [
        "BBW is honestly a bigger, more established category than a lot of people expect, not some small corner of OnlyFans. If that's your thing, there's a genuinely deep list here of creators who actually fit it, not just a handful thrown together.",
        "This list pulls creators actually getting picked as BBW right now, ranked by real engagement, not some list nobody's touched in months.",
      ],
      about: [
        '"BBW" stands for "Big Beautiful Woman", and on OnlyFans it\'s used for curvier, plus-size creators, it\'s one of the more consistently searched body-type categories on the platform. You\'ll also see it searched as "curvy" or "thick" a lot, different words, mostly the same audience looking for the same general thing.',
        "Content style varies a lot within the category too, it overlaps naturally with [[Big Tits|big-tits]], [[Ebony|ebony]], [[Latina|latina]], and [[Mature|mature]] depending on the creator, body type isn't the only thing that defines someone's page here.",
      ],
      topCreatorsIntro: 'These are the BBW creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'BBW, curvy, thick — basically the same search',
          paragraphs: [
            "People use different words for this depending on where they're from or what they're used to searching, BBW, curvy, thick, plus-size, it's mostly overlapping territory. We use BBW as the category name here since it's the more established term on OnlyFans specifically, but don't overthink the label.",
            "If you came here searching one of those other terms, you're in the right place, this list should cover what you're after either way.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            "It's a real mix, free and paid accounts sitting right next to each other, verified badges on some profiles, bundle deals popping up here and there. Nothing's hidden behind an extra step, you see the price and verification status right on the card.",
            "The ranking updates daily based on real engagement, so it's not some static list, it actually moves as creators gain or lose traction.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "Browsing is fine if you've got time, but if you've already got a specific face in mind... honestly just upload a photo to our face search instead. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Worth being upfront that it matches faces, not body type, so it won't filter by curvy specifically, but it's a solid shortcut if you already know the face you're after.",
          ],
        },
      ],
      faq: [
        {
          question: 'What does BBW actually stand for?',
          answer:
            'Big Beautiful Woman. It\'s used on OnlyFans for curvier, plus-size creators, it\'s one of the more established body-type categories on the platform.',
        },
        {
          question: 'Is BBW the same as curvy or thick?',
          answer:
            'Pretty much, yeah, different words for mostly the same search. We use BBW as the category name here since it\'s the more common term on OnlyFans specifically, but if you\'re searching curvy or thick, this is likely the right page.',
        },
        {
          question: 'Does face search filter by body type?',
          answer:
            "No, it matches faces specifically, not body type. It's useful if you've got a specific face in mind, but it won't narrow results down by curvy or plus-size on its own.",
        },
        {
          question: 'Are these creators verified?',
          answer:
            "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking, it just confirms the account is legit on OnlyFans.",
        },
        {
          question: 'Is BBW content free or paid?',
          answer:
            'Both, it\'s mixed. Use the Free filter if you want to see only $0-subscribe accounts, or browse the full list to see pricing across the board.',
        },
        {
          question: 'How often does this list update?',
          answer:
            'Daily. New accounts, pricing, and verification status all refresh every 24 hours, so it reflects real current engagement, not a stale snapshot.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system used for every category here. No manual picks.',
        },
      ],
      relatedSlugs: ['mature', 'ebony', 'big-tits', 'latina', 'top', 'free'],
    },
    es: {
      intro: [
        'BBW es honestamente una categoría más grande y consolidada de lo que mucha gente espera, no es un rincón chiquito de OnlyFans. Si eso es lo tuyo, aquí hay una lista bastante completa de creadoras que realmente encajan, no solo un puñado juntadas al azar.',
        'Esta lista junta a creadoras que realmente están siendo elegidas como BBW ahora mismo, ordenada por interacción real, no una lista que nadie toca hace meses.',
      ],
      about: [
        'BBW significa "Big Beautiful Woman" (mujer grande y hermosa), y en OnlyFans se usa para creadoras con más curvas, talla grande, es una de las categorías por tipo de cuerpo más buscadas de forma constante en la plataforma. También la vas a ver buscada como "curvy" o "thick", palabras distintas, básicamente el mismo público buscando lo mismo en general.',
        'El estilo de contenido varía bastante dentro de la categoría también, se cruza naturalmente con [[Tetonas|big-tits]], [[Ebony|ebony]], [[Latinas|latina]] y [[Maduras|mature]] dependiendo de la creadora, el tipo de cuerpo no es lo único que define la página de alguien aquí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras BBW que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'BBW, curvy, thick — básicamente la misma búsqueda',
          paragraphs: [
            'La gente usa palabras distintas para esto dependiendo de dónde sea o qué esté acostumbrada a buscar, BBW, curvy, thick, talla grande, es terreno que se cruza casi todo el tiempo. Aquí usamos BBW como nombre de categoría porque es el término más establecido en OnlyFans específicamente, pero no le des muchas vueltas a la etiqueta.',
            'Si llegaste aquí buscando alguno de esos otros términos, estás en el lugar correcto, esta lista debería cubrir lo que buscas de cualquier forma.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Es una mezcla real, cuentas gratis y de pago una al lado de la otra, algunas con insignia de verificadas, packs apareciendo de vez en cuando. Nada está escondido detrás de un paso extra, ves el precio y el estado de verificación directo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real, así que no es una lista estática, realmente se mueve según las creadoras ganan o pierden tracción.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Navegar está bien si tienes tiempo, pero si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Vale la pena ser honestos, compara caras, no tipo de cuerpo, así que no va a filtrar específicamente por curvy, pero es un buen atajo si ya sabes qué cara buscas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Qué significa BBW exactamente?',
          answer: 'Big Beautiful Woman. Se usa en OnlyFans para creadoras con más curvas, talla grande, es una de las categorías por tipo de cuerpo más establecidas de la plataforma.',
        },
        {
          question: '¿BBW es lo mismo que curvy o thick?',
          answer:
            'Prácticamente sí, palabras distintas para básicamente la misma búsqueda. Aquí usamos BBW como nombre de categoría porque es el término más común en OnlyFans específicamente, pero si buscabas curvy o thick, probablemente esta es la página correcta.',
        },
        {
          question: '¿La búsqueda facial filtra por tipo de cuerpo?',
          answer:
            'No, compara caras específicamente, no tipo de cuerpo. Es útil si ya tienes una cara específica en mente, pero no va a filtrar resultados por curvy o talla grande por sí sola.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking, solo confirma que la cuenta es legítima en OnlyFans.',
        },
        {
          question: '¿El contenido BBW es gratis o de pago?',
          answer: 'Ambos, está mezclado. Usa el filtro Gratis si quieres ver solo cuentas de suscripción $0, o navega la lista completa para ver precios en general.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y estado de verificación se actualizan cada 24 horas, así que refleja interacción real actual, no una foto vieja.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que se usa para todas las categorías aquí. Sin selección manual.',
        },
      ],
      relatedSlugs: ['mature', 'ebony', 'big-tits', 'latina', 'top', 'free'],
    },
  },

  blonde: {
    en: {
      intro: [
        "Blonde is honestly one of the most straightforward categories on here, no real ambiguity about what you're getting... it's just hair color, and there's a genuinely deep list of creators who fit it. If that's specifically your thing, this is the shortcut.",
        "This list pulls creators actually ranking under Blonde right now, based on real engagement, not just whoever happened to dye their hair recently.",
      ],
      about: [
        "\"Blonde OnlyFans\" is one of the simpler searches in this whole space, it's literally just hair color, no real debate about what counts. It's also one of the most consistently searched appearance categories on the platform, blonde has been a steady, high-demand look in adult content for a long time.",
        "Worth knowing there's a separate [[Redhead|redhead]] category too, if blonde's not quite it, that one might be closer. Blonde also overlaps naturally with [[Petite|petite]], [[Big Tits|big-tits]], and [[MILF|milf]] depending on the creator, hair color is rarely the only thing defining someone's page.",
      ],
      topCreatorsIntro: 'These are the blonde creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Not sure if you want Blonde or Redhead?',
          paragraphs: [
            "Pretty simple distinction honestly, this one's just about hair color, so if you're picturing blonde hair specifically, you're in the right place. If you're actually picturing red or ginger, the Redhead category (right above in the related list) is probably closer to what you're after.",
            "Not every blonde is the same either though, platinum, honey, strawberry blonde, dirty blonde, it's a wide range and this list doesn't filter that specifically, so expect some variety once you're browsing.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            "It's a mix same as every category here, free accounts next to paid ones, verified badges on some profiles, bundle deals showing up now and then. Nothing's hidden behind an extra click, price and verification status are right there on the card.",
            "Ranking updates daily based on real engagement too, so it's not some list that's been sitting untouched, it actually shifts as creators gain or lose traction.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "Browsing works fine if you've got a minute, but if you've already got a specific face in mind... honestly just upload a photo to our face search instead. It'll pull up creators who actually resemble that look, usually in under 2 seconds, hair color included.",
            "Not a guarantee, it's a visual match not identity verification, but it's a faster route if you already know exactly who or what you're looking for.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is Blonde just about hair color?',
          answer: "Yeah, pretty much, that's literally the whole category. No hidden criteria beyond that, it's one of the more straightforward ones on the site.",
        },
        {
          question: "What's the difference between Blonde and Redhead?",
          answer: "Just hair color, honestly, that's it. If you're picturing red or ginger instead, the Redhead category is one click away and probably closer to what you want.",
        },
        {
          question: 'Does this list include all shades of blonde?',
          answer: "It's not filtered by specific shade, platinum, honey, dirty blonde, it's all under this one category. Expect some range once you start browsing rather than one exact tone.",
        },
        {
          question: 'Does face search filter by hair color?',
          answer: "It matches faces overall, hair included as part of the visual, but it's not a dedicated hair-color filter. If you've got a specific face in mind though, it's usually the faster route.",
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking, it just confirms the account is legit on OnlyFans.",
        },
        {
          question: 'Is this list free or paid?',
          answer: "Both, it's mixed. Use the Free filter if you specifically want $0-subscribe accounts, otherwise pricing varies creator to creator.",
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, pricing, and verification status all refresh every 24 hours, so it stays current instead of stale.',
        },
      ],
      relatedSlugs: ['redhead', 'petite', 'big-tits', 'milf', 'top', 'free'],
    },
    es: {
      intro: [
        'Rubias es honestamente una de las categorías más directas de aquí, no hay mucha ambigüedad sobre qué vas a encontrar... es literalmente color de cabello, y hay una lista bastante completa de creadoras que encajan. Si eso es específicamente lo tuyo, este es el atajo.',
        'Esta lista junta a creadoras que realmente están en Rubias ahora mismo, según interacción real, no solo quien se tiñó el pelo hace poco.',
      ],
      about: [
        '"Rubias OnlyFans" es una de las búsquedas más simples de todo este espacio, es literalmente color de cabello, no hay mucho debate sobre qué cuenta. También es una de las categorías por apariencia más buscadas de forma constante en la plataforma, rubio ha sido un look de alta demanda en contenido para adultos desde hace mucho.',
        'Vale la pena saber que también existe una categoría separada de [[Pelirrojas|redhead]], si rubias no es exactamente lo tuyo, esa podría estar más cerca. Rubias también se cruza naturalmente con [[Petite|petite]], [[Tetonas|big-tits]] y [[MILF|milf]] dependiendo de la creadora, el color de cabello rara vez es lo único que define la página de alguien.',
      ],
      topCreatorsIntro: 'Estas son las creadoras rubias que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: '¿No sabes si quieres Rubias o Pelirrojas?',
          paragraphs: [
            'Distinción bastante simple honestamente, esta es solo sobre color de cabello, así que si te imaginas cabello rubio específicamente, estás en el lugar correcto. Si en realidad te imaginas rojo o pelirrojo, la categoría Pelirrojas (arriba en la lista de relacionadas) probablemente esté más cerca de lo que buscas.',
            'Tampoco todas las rubias son iguales, platinado, miel, rubio fresa, rubio oscuro, es un rango amplio y esta lista no filtra por eso específicamente, así que espera variedad una vez que empieces a navegar.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Es una mezcla igual que todas las categorías aquí, cuentas gratis al lado de cuentas de pago, algunas con insignia de verificadas, packs apareciendo de vez en cuando. Nada está escondido detrás de un clic extra, el precio y el estado de verificación están justo ahí en la tarjeta.',
            'El ranking también se actualiza a diario según interacción real, así que no es una lista que quedó ahí sin tocar, realmente se mueve según las creadoras ganan o pierden tracción.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Navegar funciona bien si tienes un rato, pero si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos, color de cabello incluido.',
            'No es garantía, es una coincidencia visual, no verificación de identidad, pero es una ruta más rápida si ya sabes exactamente a quién o qué buscas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Rubias es solo sobre color de cabello?',
          answer: 'Sí, básicamente, esa es literalmente toda la categoría. Sin criterios escondidos más allá de eso, es una de las más directas del sitio.',
        },
        {
          question: '¿Cuál es la diferencia entre Rubias y Pelirrojas?',
          answer: 'Solo color de cabello, honestamente, eso es todo. Si te imaginas rojo o pelirrojo en cambio, la categoría Pelirrojas está a un clic y probablemente más cerca de lo que buscas.',
        },
        {
          question: '¿Esta lista incluye todos los tonos de rubio?',
          answer: 'No está filtrada por tono específico, platinado, miel, rubio oscuro, todo está bajo esta misma categoría. Espera algo de rango una vez que empieces a navegar en vez de un tono exacto.',
        },
        {
          question: '¿La búsqueda facial filtra por color de cabello?',
          answer: 'Compara caras en general, el cabello incluido como parte de lo visual, pero no es un filtro dedicado de color de cabello. Eso sí, si ya tienes una cara específica en mente, normalmente es la ruta más rápida.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking, solo confirma que la cuenta es legítima en OnlyFans.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, está mezclado. Usa el filtro Gratis si específicamente quieres cuentas de suscripción $0, si no, el precio varía de creadora a creadora.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y estado de verificación se actualizan cada 24 horas, así que se mantiene actual y no desactualizada.',
        },
      ],
      relatedSlugs: ['redhead', 'petite', 'big-tits', 'milf', 'top', 'free'],
    },
  },

  latina: {
    en: {
      intro: [
        "Latina is honestly one of the biggest categories on OnlyFans, genuinely huge fanbase, and the list here reflects that, it's deep. If that's specifically what you're after, you're not gonna run out of options anytime soon.",
        "This list pulls creators actually getting picked as Latina right now, ranked by real engagement, not some list that's been sitting there for months.",
      ],
      about: [
        "\"Latina OnlyFans\" is a broad umbrella, honestly, it covers creators from a huge range of countries and backgrounds across Latin America and the Latino diaspora, it's not one specific look or nationality. There's no region-specific sub-category here either, Mexican, Colombian, Cuban, whatever, it's all under this one Latina category.",
        'It overlaps constantly with other categories too depending on the creator, [[BBW|bbw]], [[Big Tits|big-tits]], and [[Ebony|ebony]] Latina creators all show up regularly. Worth browsing broadly instead of expecting one narrow type.',
      ],
      topCreatorsIntro: 'These are the Latina creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: "It's a broad category, not one specific look",
          paragraphs: [
            "Worth being upfront about this, Latina covers a genuinely wide range of countries, backgrounds, and looks, there's no narrower breakdown by country here. If you're picturing one specific nationality or region, you might not find that exact filter, but you'll find a lot of variety within the category overall.",
            "That's honestly the point though, it's one of the biggest, most active categories on the platform precisely because it covers so much ground.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            "Same setup as every category here, free and paid accounts mixed together, verified badges on some profiles, bundle deals popping up here and there. Price and verification status are right on the card, nothing hidden behind an extra step.",
            'Ranking refreshes daily based on real engagement too, so newer popular accounts actually move up instead of sitting buried.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds, no signup needed for your first couple tries.",
            "It's a visual match, not a guarantee, but it beats browsing if you already know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is there a way to filter Latina by specific country?',
          answer: "Not right now, no, it's one broad category covering creators from across Latin America and the Latino diaspora. You'll get a lot of variety browsing rather than one narrow national look.",
        },
        {
          question: 'Why is Latina such a broad category here?',
          answer: "Because that's genuinely how the search behaves, people searching \"Latina\" aren't usually narrowing to one specific country, so we keep it as one deep, active category instead of splitting it into a bunch of thin ones.",
        },
        {
          question: 'Does Latina overlap with other categories?',
          answer: "Yeah, plenty, BBW, Big Tits, and Ebony Latina creators all show up regularly depending on the individual creator. Worth checking those too if you're not finding exactly what you want.",
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way so you can tell at a glance. Verification isn't part of the ranking itself.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed together. Use the Free filter if you want $0-subscribe accounts specifically, or browse the full list to compare pricing.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, pricing, and verification status all refresh every 24 hours.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, that's what our face search is for. Upload a photo and it'll rank creators by how close they actually look, usually in under 2 seconds. Ranking signal, not proof of identity, but a solid starting point.",
        },
      ],
      relatedSlugs: ['bbw', 'big-tits', 'ebony', 'blonde', 'top', 'free'],
    },
    es: {
      intro: [
        'Latinas es honestamente una de las categorías más grandes de OnlyFans, una base de fans genuinamente enorme, y la lista aquí lo refleja, es profunda. Si eso es específicamente lo que buscas, no te vas a quedar sin opciones pronto.',
        'Esta lista junta a creadoras que realmente están siendo elegidas como Latinas ahora mismo, ordenada por interacción real, no una lista que lleva meses ahí sin tocar.',
      ],
      about: [
        '"Latinas OnlyFans" es un término amplio, honestamente, cubre creadoras de una gran variedad de países y orígenes de toda Latinoamérica y la diáspora latina, no es un solo look o nacionalidad específica. Tampoco hay subcategorías por región aquí, mexicana, colombiana, cubana, lo que sea, todo está bajo esta única categoría de Latinas.',
        'También se cruza todo el tiempo con otras categorías dependiendo de la creadora, creadoras Latinas [[BBW|bbw]], [[Tetonas|big-tits]] y [[Ebony|ebony]] aparecen seguido. Vale la pena navegar en general en vez de esperar un solo tipo específico.',
      ],
      topCreatorsIntro: 'Estas son las creadoras Latinas que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Es una categoría amplia, no un solo look específico',
          paragraphs: [
            'Vale la pena ser honestos con esto, Latinas cubre una gama realmente amplia de países, orígenes y looks, no hay una división más específica por país aquí. Si te imaginas una nacionalidad o región específica, puede que no encuentres ese filtro exacto, pero vas a encontrar bastante variedad dentro de la categoría en general.',
            'Ese es honestamente el punto, es una de las categorías más grandes y activas de la plataforma precisamente porque cubre tanto terreno.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Misma configuración que todas las categorías aquí, cuentas gratis y de pago mezcladas, algunas con insignia de verificadas, packs apareciendo de vez en cuando. El precio y el estado de verificación están justo en la tarjeta, nada escondido detrás de un paso extra.',
            'El ranking también se actualiza a diario según interacción real, así que las cuentas nuevas y populares realmente suben en vez de quedar enterradas.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos, sin necesidad de registrarte para tus primeras búsquedas.',
            'Es una coincidencia visual, no una garantía, pero le gana a navegar si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Se puede filtrar Latinas por país específico?',
          answer: 'Por ahora no, es una categoría amplia que cubre creadoras de toda Latinoamérica y la diáspora latina. Vas a encontrar bastante variedad navegando en vez de un solo look nacional específico.',
        },
        {
          question: '¿Por qué Latinas es una categoría tan amplia aquí?',
          answer: "Porque así se comporta realmente la búsqueda, la gente que busca \"Latinas\" normalmente no está acotando a un país específico, así que la mantenemos como una sola categoría profunda y activa en vez de dividirla en varias delgadas.",
        },
        {
          question: '¿Latinas se cruza con otras categorías?',
          answer: 'Sí, bastante, creadoras Latinas BBW, Tetonas y Ebony aparecen seguido dependiendo de la creadora individual. Vale la pena revisar esas también si no encuentras exactamente lo que buscas.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos para que lo veas de un vistazo. La verificación no es parte del ranking en sí.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclados. Usa el filtro Gratis si quieres cuentas de suscripción $0 específicamente, o navega la lista completa para comparar precios.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y estado de verificación se actualizan cada 24 horas.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, para eso está nuestra búsqueda facial. Subes una foto y ordena a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos. Es una señal de similitud, no prueba de identidad, pero es un buen punto de partida.',
        },
      ],
      relatedSlugs: ['bbw', 'big-tits', 'ebony', 'blonde', 'top', 'free'],
    },
  },

  asian: {
    en: {
      intro: [
        "Asian is a big, broad category here, genuinely popular, and the list reflects that depth. If you want something more specific though, we've also got dedicated Japanese and Korean pages, this one's more the wide-net option.",
        "This list pulls creators actually getting picked as Asian right now, ranked by real engagement, not some list that's been ignored for months.",
      ],
      about: [
        "\"Asian OnlyFans\" is the broader umbrella here, it covers creators from across a huge range of countries and backgrounds, not one specific nationality. If you want something narrower, we've got dedicated [[Japanese|japanese]] and [[Korean|korean]] pages too, those are more specific, this one's the wide-net search.",
        'It overlaps with plenty of other categories as well, [[Petite|petite]] and [[Indian|indian]] Asian creators both show up regularly here, for example. If you\'re not finding exactly what you want on this broader list, those narrower pages are worth a look.',
      ],
      topCreatorsIntro: 'These are the Asian creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Asian vs. Japanese vs. Korean — pick the right one',
          paragraphs: [
            "Quick heads up since this trips people up sometimes, Asian is the broad category, Japanese and Korean are their own dedicated pages if you want something more specific. Chinese, Thai, Filipino, and other backgrounds mostly fall under this general Asian list since they don't have their own dedicated page yet.",
            "If you already know exactly which background you're after and it's Japanese or Korean specifically, jump straight to that page instead, you'll get a more focused list.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            "Standard mix, free accounts next to paid ones, verified badges on some profiles, bundle deals showing up here and there. Everything you need, price and verification, is right there on the card, no extra clicks required.",
            "The ranking updates daily too, based on real engagement, so it's not some frozen list from months back.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "Browsing's fine if you've got time, but if you've already got a specific face in mind... honestly just upload a photo to our face search instead. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "It's a visual match, not a guarantee, but it's a faster route than scrolling if you already know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: "What's the difference between Asian, Japanese, and Korean here?",
          answer: 'Asian is the broad category covering a wide range of backgrounds, Japanese and Korean are their own narrower, dedicated pages. If you know specifically which one you want, jump to that page for a more focused list.',
        },
        {
          question: 'Does Asian include Chinese, Thai, or Filipino creators?',
          answer: "Yeah, those and other backgrounds mostly fall under this general Asian category since they don't have their own dedicated page yet. It's the broadest option if you want to see everything.",
        },
        {
          question: "Why isn't there a dedicated page for every nationality?",
          answer: 'Mostly comes down to how people actually search, Japanese and Korean get searched specifically enough to warrant their own pages, other backgrounds are more commonly searched under the broader Asian term.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking, it just confirms the account is legit on OnlyFans.",
        },
        {
          question: 'Is this list free or paid?',
          answer: "Both, it's mixed. Use the Free filter if you specifically want $0-subscribe accounts.",
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, pricing, and verification status all refresh every 24 hours.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds. Ranking signal, not proof of identity, but a solid starting point.",
        },
      ],
      relatedSlugs: ['japanese', 'korean', 'indian', 'petite', 'top', 'free'],
    },
    es: {
      intro: [
        'Asiáticas es una categoría grande y amplia aquí, genuinamente popular, y la lista refleja esa profundidad. Si quieres algo más específico eso sí, también tenemos páginas dedicadas de Japonesas y Coreanas, esta es más la opción de red amplia.',
        'Esta lista junta a creadoras que realmente están siendo elegidas como Asiáticas ahora mismo, ordenada por interacción real, no una lista ignorada hace meses.',
      ],
      about: [
        '"Asiáticas OnlyFans" es el término más amplio aquí, cubre creadoras de una gran variedad de países y orígenes, no una nacionalidad específica. Si quieres algo más acotado, también tenemos páginas dedicadas de [[Japonesas|japanese]] y [[Coreanas|korean]], esas son más específicas, esta es la búsqueda de red amplia.',
        'También se cruza con bastantes otras categorías, creadoras asiáticas [[Petite|petite]] e [[Indias|indian]] aparecen seguido aquí, por ejemplo. Si no encuentras exactamente lo que buscas en esta lista más amplia, vale la pena revisar esas páginas más específicas.',
      ],
      topCreatorsIntro: 'Estas son las creadoras asiáticas que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Asiáticas vs. Japonesas vs. Coreanas — elige la correcta',
          paragraphs: [
            'Aviso rápido porque esto confunde a veces, Asiáticas es la categoría amplia, Japonesas y Coreanas tienen sus propias páginas dedicadas si quieres algo más específico. Chinas, tailandesas, filipinas y otros orígenes caen sobre todo en esta lista general de Asiáticas porque todavía no tienen su propia página dedicada.',
            'Si ya sabes exactamente qué origen buscas y es Japonesas o Coreanas específicamente, mejor ve directo a esa página, vas a tener una lista más enfocada.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, cuentas gratis al lado de cuentas de pago, algunas con insignia de verificadas, packs apareciendo de vez en cuando. Todo lo que necesitas, precio y verificación, está justo en la tarjeta, sin clics extra necesarios.',
            'El ranking también se actualiza a diario, según interacción real, así que no es una lista congelada de hace meses.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Navegar está bien si tienes tiempo, pero si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Es una coincidencia visual, no una garantía, pero es una ruta más rápida que scrollear si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuál es la diferencia entre Asiáticas, Japonesas y Coreanas aquí?',
          answer: 'Asiáticas es la categoría amplia que cubre una gran variedad de orígenes, Japonesas y Coreanas son páginas propias, más específicas y dedicadas. Si ya sabes cuál quieres específicamente, ve directo a esa página para una lista más enfocada.',
        },
        {
          question: '¿Asiáticas incluye creadoras chinas, tailandesas o filipinas?',
          answer: 'Sí, esas y otros orígenes caen sobre todo en esta categoría general de Asiáticas porque todavía no tienen su propia página dedicada. Es la opción más amplia si quieres ver de todo.',
        },
        {
          question: '¿Por qué no hay una página dedicada para cada nacionalidad?',
          answer: 'Sobre todo depende de cómo busca realmente la gente, Japonesas y Coreanas se buscan lo suficientemente específico como para justificar sus propias páginas, otros orígenes se buscan más comúnmente bajo el término general Asiáticas.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking, solo confirma que la cuenta es legítima en OnlyFans.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, está mezclado. Usa el filtro Gratis si específicamente quieres cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y estado de verificación se actualizan cada 24 horas.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos. Es una señal de similitud, no prueba de identidad, pero es un buen punto de partida.',
        },
      ],
      relatedSlugs: ['japanese', 'korean', 'indian', 'petite', 'top', 'free'],
    },
  },

  ebony: {
    en: {
      intro: [
        "Ebony is one of the most consistently popular categories on OnlyFans, genuinely deep list here, not a small side category by any measure. If that's specifically what you're after, you've got plenty to work with.",
        "This list pulls creators actually getting picked as Ebony right now, ranked by real engagement, not some static list nobody's touched in a while.",
      ],
      about: [
        "\"Ebony OnlyFans\" is used for Black creators, it's one of the most consistently searched appearance categories on the platform, genuinely broad and active. Worth knowing there's a separate [[BBC|bbc]] category too, that one's about a specific act, Ebony here is about appearance, they're not the same thing even though they get mixed up sometimes.",
        "Ebony also overlaps naturally with [[BBW|bbw]], [[Big Tits|big-tits]], and [[Latina|latina]] depending on the creator, it's not one single narrow look, there's a real range once you start browsing.",
      ],
      topCreatorsIntro: 'These are the Ebony creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Ebony vs. BBC — worth clearing up',
          paragraphs: [
            "These two get mixed up sometimes so it's worth being direct about it, Ebony here is about appearance, Black creators generally, BBC is a separate category built around a specific act. Not every Ebony creator does BBC content and not every BBC-tagged profile is necessarily Ebony, they're related but distinct categories.",
            "If you're specifically after one or the other, check the right page instead of assuming they're interchangeable.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Real mix, free and paid accounts sitting side by side, verified badges on some profiles, bundle deals showing up now and then. Price and verification are right there on the card, nothing hidden behind an extra step.',
            'Ranking updates daily based on real engagement too, so it actually moves as creators gain traction instead of sitting frozen.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "Browsing's fine if you've got time, but if you've already got a specific face in mind... honestly just upload a photo to our face search instead. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "It's a visual match, not a guarantee, but it's the faster route if you already know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: "What's the difference between Ebony and BBC here?",
          answer: "Ebony is about appearance, Black creators generally. BBC is a separate category built around a specific act. They're related but not the same thing, not every creator in one is in the other.",
        },
        {
          question: 'Is Ebony a broad or narrow category?',
          answer: 'Pretty broad honestly, it covers a real range of looks and styles, not one narrow type. Expect variety once you start browsing rather than a single specific look.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way so you can tell at a glance. Verification isn't part of the ranking itself.",
        },
        {
          question: 'Does this category overlap with others, like BBW or Latina?',
          answer: 'Yeah, plenty. Ebony BBW and Ebony Latina creators both show up regularly depending on the individual creator, worth browsing broadly.',
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed together. Use the Free filter if you specifically want $0-subscribe accounts, or browse the full list to compare pricing.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, pricing, and verification status all refresh every 24 hours.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, that's what our face search is for. Upload a photo and it'll rank creators by how close they actually look, usually in under 2 seconds. Ranking signal, not proof of identity, but a solid starting point.",
        },
      ],
      relatedSlugs: ['bbw', 'big-tits', 'latina', 'top', 'free'],
    },
    es: {
      intro: [
        'Ebony es una de las categorías más consistentemente populares de OnlyFans, una lista genuinamente profunda aquí, para nada una categoría secundaria pequeña. Si eso es específicamente lo que buscas, tienes bastante con qué trabajar.',
        'Esta lista junta a creadoras que realmente están siendo elegidas como Ebony ahora mismo, ordenada por interacción real, no una lista estática que nadie toca hace rato.',
      ],
      about: [
        '"Ebony OnlyFans" se usa para creadoras negras, es una de las categorías por apariencia más buscadas de forma constante en la plataforma, genuinamente amplia y activa. Vale la pena saber que también existe una categoría separada de [[BBC|bbc]], esa es sobre un acto específico, Ebony aquí es sobre apariencia, no son lo mismo aunque a veces se confundan.',
        'Ebony también se cruza naturalmente con [[BBW|bbw]], [[Tetonas|big-tits]] y [[Latinas|latina]] dependiendo de la creadora, no es un solo look angosto, hay bastante rango una vez que empiezas a navegar.',
      ],
      topCreatorsIntro: 'Estas son las creadoras Ebony que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Ebony vs. BBC — vale la pena aclararlo',
          paragraphs: [
            'Estas dos se confunden a veces así que vale la pena ser directos, Ebony aquí es sobre apariencia, creadoras negras en general, BBC es una categoría separada armada alrededor de un acto específico. No todas las creadoras Ebony hacen contenido BBC y no todo perfil etiquetado BBC es necesariamente Ebony, están relacionadas pero son categorías distintas.',
            'Si buscas específicamente una u otra, revisa la página correcta en vez de asumir que son intercambiables.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla real, cuentas gratis y de pago una al lado de la otra, algunas con insignia de verificadas, packs apareciendo de vez en cuando. El precio y la verificación están justo en la tarjeta, nada escondido detrás de un paso extra.',
            'El ranking también se actualiza a diario según interacción real, así que realmente se mueve conforme las creadoras ganan tracción en vez de quedarse congelado.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Navegar está bien si tienes tiempo, pero si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Es una coincidencia visual, no una garantía, pero es la ruta más rápida si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuál es la diferencia entre Ebony y BBC aquí?',
          answer: 'Ebony es sobre apariencia, creadoras negras en general. BBC es una categoría separada armada alrededor de un acto específico. Están relacionadas pero no son lo mismo, no toda creadora de una está en la otra.',
        },
        {
          question: '¿Ebony es una categoría amplia o angosta?',
          answer: 'Bastante amplia honestamente, cubre un rango real de looks y estilos, no un solo tipo angosto. Espera variedad una vez que empieces a navegar en vez de un look específico único.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos para que lo veas de un vistazo. La verificación no es parte del ranking en sí.',
        },
        {
          question: '¿Esta categoría se cruza con otras, como BBW o Latinas?',
          answer: 'Sí, bastante. Creadoras Ebony BBW y Ebony Latinas aparecen seguido dependiendo de la creadora individual, vale la pena navegar en general.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, está mezclado. Usa el filtro Gratis si específicamente quieres cuentas de suscripción $0, o navega la lista completa para comparar precios.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y estado de verificación se actualizan cada 24 horas.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, para eso está nuestra búsqueda facial. Subes una foto y ordena a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos. Es una señal de similitud, no prueba de identidad, pero es un buen punto de partida.',
        },
      ],
      relatedSlugs: ['bbw', 'big-tits', 'latina', 'top', 'free'],
    },
  },

  redhead: {
    en: {
      intro: [
        "Redhead's a smaller list than some of the bigger categories, but it's genuinely one of the most requested looks out there... it's just less common naturally, so demand tends to outpace supply, ya know. If that's your thing, every creator here actually fits it.",
        'This list pulls creators ranking under Redhead right now, based on real engagement, not just whoever happened to tag themselves that way.',
      ],
      about: [
        '"Redhead OnlyFans" is about hair color, plain and simple, natural or dyed red, ginger, strawberry blonde-leaning-red, it\'s all under this one category. Redheads make up a genuinely small percentage of the population in general, which is honestly part of why this specific look gets searched so much.',
        "There's a separate [[Blonde|blonde]] category too if red's not quite it. Redhead also crosses over with [[Petite|petite]] and [[MILF|milf]] depending on the creator, hair color's rarely the only thing on someone's page.",
      ],
      topCreatorsIntro: 'These are the redhead creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Why this list feels smaller than some others',
          paragraphs: [
            "Not gonna pretend otherwise, genuinely red hair (natural or well-dyed) is just rarer than blonde or brunette, so the pool here is smaller by nature, not because we're filtering it down artificially. Every profile that shows up is actually tagged Redhead though, not padded out with close-enough matches.",
            "Worth checking back regularly too since new creators do get added, the list isn't static even if it moves a bit slower than some of the bigger categories.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            "Same mix as everywhere else on the site, free and paid accounts together, verified badges on some, bundle deals here and there. Price and verification sit right on the card, nothing hidden.",
            "Ranking updates daily based on real engagement, so it's not some list nobody's touched in a while.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but a faster route if you know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: 'Why is the Redhead list shorter than some other categories?',
          answer: 'Genuinely just because natural or convincingly-dyed red hair is rarer than blonde or brunette, so the actual pool of creators is smaller. Everyone listed is actually tagged Redhead though, not padded with close matches.',
        },
        {
          question: 'Does this include dyed red hair or just natural?',
          answer: "Both, honestly, we're not checking roots. If a creator's rocking red hair, dyed or natural, they can show up here.",
        },
        {
          question: "What's the difference between Redhead and Blonde?",
          answer: "Just hair color, that's the whole distinction. If you're picturing blonde instead, that's a separate category one click away.",
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking itself.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts specifically.',
        },
        {
          question: 'How often does this list update?',
          answer: "Daily, same as every category, though because the pool's smaller, changes might feel less dramatic week to week.",
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds.",
        },
      ],
      relatedSlugs: ['blonde', 'petite', 'milf', 'top', 'free'],
    },
    es: {
      intro: [
        'Pelirrojas es una lista más chica que algunas de las categorías grandes, pero es honestamente uno de los looks más pedidos que hay... es menos común de forma natural, así que la demanda suele superar la oferta, ya sabes. Si eso es lo tuyo, cada creadora aquí realmente encaja.',
        'Esta lista junta a creadoras que están en Pelirrojas ahora mismo, según interacción real, no solo quien se etiquetó así una vez.',
      ],
      about: [
        '"Pelirrojas OnlyFans" es sobre color de cabello, simple y llano, natural o teñido de rojo, ginger, rubio tirando a rojo, todo está bajo esta única categoría. Las pelirrojas son un porcentaje genuinamente chico de la población en general, lo cual honestamente es parte de por qué este look específico se busca tanto.',
        'También hay una categoría separada de [[Rubias|blonde]] si el rojo no es exactamente lo tuyo. Pelirrojas también se cruza con [[Petite|petite]] y [[MILF|milf]] dependiendo de la creadora, el color de cabello rara vez es lo único en la página de alguien.',
      ],
      topCreatorsIntro: 'Estas son las creadoras pelirrojas que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Por qué esta lista se siente más chica que otras',
          paragraphs: [
            'No voy a fingir lo contrario, el cabello rojo genuino (natural o bien teñido) es simplemente más raro que rubio o castaño, así que el grupo aquí es más chico por naturaleza, no porque lo filtremos a propósito. Cada perfil que aparece está de verdad etiquetado Pelirrojas eso sí, no relleno con parecidos.',
            'Vale la pena revisar seguido también porque sí se agregan creadoras nuevas, la lista no es estática aunque se mueva un poco más lento que algunas categorías grandes.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Misma mezcla que en todo el sitio, cuentas gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta, nada escondido.',
            'El ranking se actualiza a diario según interacción real, así que no es una lista que nadie toca hace rato.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero una ruta más rápida si ya sabes a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Por qué la lista de Pelirrojas es más corta que otras categorías?',
          answer: 'Genuinamente porque el cabello rojo natural o bien teñido es más raro que rubio o castaño, así que el grupo real de creadoras es más chico. Eso sí, todas las que aparecen están de verdad etiquetadas Pelirrojas, no rellenas con parecidos.',
        },
        {
          question: '¿Incluye cabello teñido de rojo o solo natural?',
          answer: 'Ambos, honestamente, no estamos revisando raíces. Si una creadora tiene el pelo rojo, teñido o natural, puede aparecer aquí.',
        },
        {
          question: '¿Cuál es la diferencia entre Pelirrojas y Rubias?',
          answer: 'Solo color de cabello, esa es toda la distinción. Si te imaginas rubio en cambio, esa es una categoría separada a un clic.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking en sí.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0 específicamente.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, igual que todas las categorías, aunque como el grupo es más chico, los cambios pueden sentirse menos dramáticos semana a semana.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['blonde', 'petite', 'milf', 'top', 'free'],
    },
  },

  petite: {
    en: {
      intro: [
        'Petite is honestly one of the more popular body-type categories here, smaller frame, slim build, that general look. It\'s a real, deep list, not some thin afterthought category.',
        'This list pulls creators actually ranking under Petite right now, based on real engagement, not a stale snapshot.',
      ],
      about: [
        '"Petite OnlyFans" covers smaller-framed, slimmer-build creators, it\'s mostly a body-type descriptor rather than anything tied to one specific look or nationality. It overlaps constantly with [[Small Tits|small-tits]] since the two builds often go together, though not always, plenty of petite creators don\'t fit that specific pairing.',
        'It also crosses with [[Blonde|blonde]] and [[Asian|asian]] pretty often depending on the individual creator. Worth browsing broadly since petite spans a lot of different looks within that general body type.',
      ],
      topCreatorsIntro: 'These are the petite creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Petite and Small Tits often overlap, but not always',
          paragraphs: [
            "These two get grouped together a lot since smaller frame and smaller chest tend to go hand in hand, but it's not a rule. Plenty of petite creators don't fit that specific pairing, and vice versa, so it's worth browsing both categories if you're not finding exactly what you want on just one.",
            'Petite here is really about overall build, not one specific measurement or feature.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid accounts side by side, verified badges on some, bundle deals showing up now and then. Price and verification are right on the card, no extra clicks.',
            'Ranking updates daily based on real engagement, so newer popular accounts actually surface instead of staying buried.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "Browsing works if you've got time, but if you've already got a specific face in mind... honestly just upload a photo to our face search instead. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Worth noting it matches faces, not body frame specifically, so it won't filter by petite on its own, but it's a solid shortcut if you know the face you're after.",
          ],
        },
      ],
      faq: [
        {
          question: 'What exactly counts as petite?',
          answer: "Smaller frame, slimmer build in general, it's more of an overall body-type descriptor than one specific measurement. There's some natural range within the category.",
        },
        {
          question: 'Is Petite the same as Small Tits?',
          answer: "They overlap a lot since the two builds often go together, but they're separate categories. Plenty of petite creators aren't specifically small tits, and vice versa.",
        },
        {
          question: 'Does face search filter by body type?',
          answer: "No, it matches faces specifically, not build. Useful if you've got a specific face in mind, but won't narrow by petite on its own.",
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, pricing, and verification all refresh every 24 hours.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every other category here.',
        },
      ],
      relatedSlugs: ['small-tits', 'blonde', 'asian', 'top', 'free'],
    },
    es: {
      intro: [
        'Petite es honestamente una de las categorías por tipo de cuerpo más populares aquí, contextura más pequeña, cuerpo delgado, ese look en general. Es una lista real y profunda, no una categoría de relleno.',
        'Esta lista junta a creadoras que están en Petite ahora mismo, según interacción real, no una foto vieja.',
      ],
      about: [
        '"Petite OnlyFans" cubre creadoras de contextura más pequeña, cuerpo delgado, es sobre todo un descriptor de tipo de cuerpo más que algo ligado a un look o nacionalidad específica. Se cruza todo el tiempo con [[Tetas Pequeñas|small-tits]] porque las dos cosas suelen ir juntas, aunque no siempre, bastantes creadoras petite no encajan en esa combinación específica.',
        'También se cruza con [[Rubias|blonde]] y [[Asiáticas|asian]] bastante seguido dependiendo de la creadora. Vale la pena navegar en general porque petite abarca muchos looks distintos dentro de ese tipo de cuerpo general.',
      ],
      topCreatorsIntro: 'Estas son las creadoras petite que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Petite y Tetas Pequeñas se cruzan seguido, pero no siempre',
          paragraphs: [
            'Estas dos se agrupan bastante porque contextura pequeña y pecho pequeño suelen ir de la mano, pero no es una regla. Bastantes creadoras petite no encajan en esa combinación específica, y viceversa, así que vale la pena navegar las dos categorías si no encuentras exactamente lo que buscas en una sola.',
            'Petite aquí es realmente sobre la contextura general, no una medida o rasgo específico.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, cuentas gratis y de pago una al lado de la otra, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta, sin clics extra.',
            'El ranking se actualiza a diario según interacción real, así que las cuentas nuevas y populares realmente aparecen en vez de quedar enterradas.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Navegar funciona si tienes tiempo, pero si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Vale la pena aclarar que compara caras, no contextura específicamente, así que no va a filtrar por petite por sí sola, pero es un buen atajo si ya sabes qué cara buscas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Qué cuenta exactamente como petite?',
          answer: 'Contextura más pequeña, cuerpo delgado en general, es más un descriptor de tipo de cuerpo general que una medida específica. Hay algo de rango natural dentro de la categoría.',
        },
        {
          question: '¿Petite es lo mismo que Tetas Pequeñas?',
          answer: 'Se cruzan bastante porque las dos contexturas suelen ir juntas, pero son categorías separadas. Bastantes creadoras petite no son específicamente tetas pequeñas, y viceversa.',
        },
        {
          question: '¿La búsqueda facial filtra por tipo de cuerpo?',
          answer: 'No, compara caras específicamente, no contextura. Útil si ya tienes una cara específica en mente, pero no va a filtrar por petite por sí sola.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y verificación se actualizan cada 24 horas.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías aquí.',
        },
      ],
      relatedSlugs: ['small-tits', 'blonde', 'asian', 'top', 'free'],
    },
  },

  models: {
    en: {
      intro: [
        "Models is basically the polished, professional end of the spectrum, creators with that put-together, editorial kind of look. It's a genuinely popular category, not some vague catch-all.",
        'This list pulls creators actually ranking under Models right now, based on real engagement, not who submitted the best headshot.',
      ],
      about: [
        '"Models OnlyFans" leans toward creators with a more polished, professional presentation, think studio-quality photos, consistent branding, that kind of thing, rather than one specific look or body type. It\'s less about appearance category and more about production style and presentation.',
        'It overlaps with [[Celebrity|celebrity]] and [[Top|top]] pretty often since a lot of the same creators show up across those lists. Content style varies within Models too, [[Big Tits|big-tits]] and [[Blonde|blonde]] model-style creators both show up regularly.',
      ],
      topCreatorsIntro: 'These are the creators actually leading the Models category right now, ranked by real engagement.',
      sections: [
        {
          heading: "What actually makes someone 'Models' here",
          paragraphs: [
            "It's less about one specific look and more about presentation, honestly, polished photos, consistent branding, that editorial feel. Two creators with totally different body types or ethnicities can both land here if the presentation fits.",
            "So don't expect one narrow appearance type, expect a certain production quality and style instead.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Same mix as every category, free and paid accounts together, verified badges on some, bundle deals here and there. Price and verification sit right on the card.',
            "Ranking updates daily based on real engagement, so it's a genuinely live list, not something frozen in time.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "Browsing's fine if you've got a minute, but if you've already got a specific face in mind... honestly just upload a photo to our face search instead. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but faster if you already know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: "What makes a creator count as 'Models' here?",
          answer: "More about presentation than appearance, polished photos, consistent branding, that editorial style. It's not tied to one specific look or body type.",
        },
        {
          question: 'Does Models overlap with Celebrity?',
          answer: "Yeah, pretty often, a lot of the same creators show up on both lists. Worth checking both if you're not finding exactly what you want.",
        },
        {
          question: 'Is Models just one body type or look?',
          answer: 'No, it spans a real range, big tits, blonde, all kinds of looks show up here, the common thread is presentation style, not appearance.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts specifically.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, pricing, and verification all refresh every 24 hours.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds.",
        },
      ],
      relatedSlugs: ['top', 'celebrity', 'big-tits', 'blonde', 'free'],
    },
    es: {
      intro: [
        'Modelos es básicamente el extremo más pulido y profesional del espectro, creadoras con ese look armado, tipo editorial. Es una categoría genuinamente popular, no un cajón de sastre vago.',
        'Esta lista junta a creadoras que están en Modelos ahora mismo, según interacción real, no quien mandó la mejor foto de perfil.',
      ],
      about: [
        '"Modelos OnlyFans" se inclina hacia creadoras con una presentación más pulida y profesional, piensa en fotos de calidad de estudio, marca personal consistente, ese tipo de cosas, más que un look o tipo de cuerpo específico. Es menos una categoría de apariencia y más sobre estilo de producción y presentación.',
        'Se cruza con [[Famosas|celebrity]] y [[Top|top]] bastante seguido porque muchas de las mismas creadoras aparecen en esas listas también. El estilo de contenido también varía dentro de Modelos, creadoras estilo modelo [[Tetonas|big-tits]] y [[Rubias|blonde]] aparecen seguido.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Modelos ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: "Qué es lo que realmente hace que alguien sea 'Modelos' aquí",
          paragraphs: [
            'Es menos sobre un look específico y más sobre presentación, honestamente, fotos pulidas, marca consistente, esa sensación editorial. Dos creadoras con tipos de cuerpo o etnias totalmente distintas pueden aparecer aquí si la presentación encaja.',
            'Así que no esperes un solo tipo de apariencia angosto, espera cierta calidad y estilo de producción en cambio.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Misma mezcla que todas las categorías, cuentas gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real, así que es una lista genuinamente viva, no algo congelado en el tiempo.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Navegar está bien si tienes un rato, pero si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero más rápido si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: "¿Qué hace que una creadora cuente como 'Modelos' aquí?",
          answer: 'Más sobre presentación que apariencia, fotos pulidas, marca consistente, ese estilo editorial. No está ligado a un look o tipo de cuerpo específico.',
        },
        {
          question: '¿Modelos se cruza con Famosas?',
          answer: 'Sí, bastante seguido, muchas de las mismas creadoras aparecen en las dos listas. Vale la pena revisar ambas si no encuentras exactamente lo que buscas.',
        },
        {
          question: '¿Modelos es un solo tipo de cuerpo o look?',
          answer: 'No, abarca un rango real, tetonas, rubias, todo tipo de looks aparecen aquí, el hilo conductor es el estilo de presentación, no la apariencia.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0 específicamente.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y verificación se actualizan cada 24 horas.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['top', 'celebrity', 'big-tits', 'blonde', 'free'],
    },
  },

  'white-girls': {
    en: {
      intro: [
        'White Girls is a straightforward ethnicity category here, does what it says, and there\'s a genuinely deep list of creators who fit it. Simple search, simple results.',
        "This list pulls creators actually ranking under White Girls right now, based on real engagement, not some list nobody's updated in a while.",
      ],
      about: [
        '"White Girls OnlyFans" is exactly what it sounds like, white/Caucasian creators, it\'s a broad category covering a huge range of looks, hair colors, and styles rather than one narrow type. If you\'re picturing something more specific, hair color categories like [[Blonde|blonde]] or ethnicity-focused ones like [[Latina|latina]] might narrow things down better.',
        'It overlaps with plenty of other categories too depending on the individual creator, [[MILF|milf]] white girls show up regularly, for example, appearance is rarely the only thing defining someone\'s page.',
      ],
      topCreatorsIntro: 'These are the creators actually leading the White Girls category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A broad category, worth narrowing if you can',
          paragraphs: [
            "This one covers a lot of ground honestly, every hair color, every style, it's a wide net. If you've got something more specific in mind, checking a narrower category like Blonde or Redhead alongside this one usually gets you closer faster.",
            'That said, if you just want the broad search, this list has plenty to work with on its own.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid side by side, verified badges on some, bundle deals showing up now and then. Price and verification are right on the card.',
            "Ranking refreshes daily based on real engagement, so it's not some static snapshot.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but a faster route if you know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is this a broad or narrow category?',
          answer: 'Pretty broad, honestly, it covers every hair color and style within that general ethnicity. If you want something more specific, pairing it with a category like Blonde or Redhead usually narrows things down.',
        },
        {
          question: 'Does this overlap with hair-color categories like Blonde or Redhead?',
          answer: "Yeah, definitely, plenty of creators show up across both. Worth checking those too if you've got a more specific look in mind.",
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, pricing, and verification all refresh every 24 hours.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category here.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds.",
        },
      ],
      relatedSlugs: ['blonde', 'latina', 'milf', 'top', 'free'],
    },
    es: {
      intro: [
        'Chicas Blancas es una categoría directa por etnia aquí, hace lo que dice, y hay una lista genuinamente profunda de creadoras que encajan. Búsqueda simple, resultados simples.',
        'Esta lista junta a creadoras que están en Chicas Blancas ahora mismo, según interacción real, no una lista que nadie actualiza hace rato.',
      ],
      about: [
        '"Chicas Blancas OnlyFans" es exactamente lo que suena, creadoras blancas/caucásicas, es una categoría amplia que cubre una gran variedad de looks, colores de cabello y estilos en vez de un solo tipo angosto. Si te imaginas algo más específico, categorías de color de cabello como [[Rubias|blonde]] o enfocadas en etnia como [[Latinas|latina]] podrían acotar mejor.',
        'También se cruza con bastantes otras categorías dependiendo de la creadora individual, chicas blancas [[MILF|milf]] aparecen seguido, por ejemplo, la apariencia rara vez es lo único que define la página de alguien.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Chicas Blancas ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una categoría amplia, vale la pena acotar si puedes',
          paragraphs: [
            'Esta cubre bastante terreno honestamente, todos los colores de cabello, todos los estilos, es una red amplia. Si tienes algo más específico en mente, revisar una categoría más angosta como Rubias o Pelirrojas junto con esta normalmente te acerca más rápido.',
            'Dicho eso, si solo quieres la búsqueda amplia, esta lista tiene bastante con qué trabajar por sí sola.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago una al lado de la otra, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real, así que no es una foto estática.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero una ruta más rápida si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Esta es una categoría amplia o angosta?',
          answer: 'Bastante amplia honestamente, cubre todos los colores de cabello y estilos dentro de esa etnia en general. Si quieres algo más específico, combinarla con una categoría como Rubias o Pelirrojas normalmente acota mejor.',
        },
        {
          question: '¿Se cruza con categorías de color de cabello como Rubias o Pelirrojas?',
          answer: 'Sí, definitivamente, bastantes creadoras aparecen en ambas. Vale la pena revisar esas también si tienes un look más específico en mente.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y verificación se actualizan cada 24 horas.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías aquí.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['blonde', 'latina', 'milf', 'top', 'free'],
    },
  },

  mature: {
    en: {
      intro: [
        'Mature is the broader older-creator category here, wider net than MILF specifically. If you want a real range of older creators without the narrower MILF framing, this is the one.',
        'This list pulls creators actually ranking under Mature right now, based on real engagement, not some frozen list from months back.',
      ],
      about: [
        '"Mature OnlyFans" is a broader category than [[MILF|milf]], it\'s not tied to that specific confident-mom persona, just older creators in general, wider age range, wider variety of styles. The two overlap a ton, plenty of creators show up on both lists, but Mature casts a wider net.',
        'It also crosses over with [[Old Young|old-young]] and [[BBW|bbw]] depending on the creator. If MILF felt too narrow, this is probably the page you actually want.',
      ],
      topCreatorsIntro: 'These are the mature creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Mature vs. MILF — the wider net',
          paragraphs: [
            'Mature is the broader category, honestly, MILF leans into a specific confident persona, Mature is just older creators in general without that narrower framing. A lot of overlap between the two, but if you want the wider search, this is the one.',
            "Neither has a strict age cutoff either, it's more about general vibe and presentation than a hard number.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement, so it actually moves instead of sitting static.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "Browsing's fine if you've got time, but if you've already got a specific face in mind... honestly just upload a photo to our face search instead. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but faster if you know exactly who you're after.",
          ],
        },
      ],
      faq: [
        {
          question: "What's the difference between Mature and MILF?",
          answer: 'Mature\'s the broader category, MILF leans into that specific confident-persona angle. Plenty of creators overlap on both lists, but Mature casts a wider net.',
        },
        {
          question: 'Is there an age cutoff for Mature?',
          answer: 'Not a strict one, no, it\'s more about general vibe and presentation than one specific number.',
        },
        {
          question: 'Does Mature overlap with Old Young?',
          answer: 'Yeah, sometimes, depending on the individual creator and content style. Worth checking both if that\'s relevant to what you\'re after.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, pricing, and verification all refresh every 24 hours.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds.",
        },
      ],
      relatedSlugs: ['milf', 'old-young', 'bbw', 'top', 'free'],
    },
    es: {
      intro: [
        'Maduras es la categoría más amplia de creadoras mayores aquí, red más ancha que MILF específicamente. Si quieres un rango real de creadoras mayores sin el enfoque más angosto de MILF, esta es la categoría.',
        'Esta lista junta a creadoras que están en Maduras ahora mismo, según interacción real, no una lista congelada de hace meses.',
      ],
      about: [
        '"Maduras OnlyFans" es una categoría más amplia que [[MILF|milf]], no está ligada a ese personaje seguro y de mamá específico, son solo creadoras mayores en general, rango de edad más amplio, variedad de estilos más amplia. Las dos se cruzan un montón, bastantes creadoras aparecen en ambas listas, pero Maduras tira una red más ancha.',
        'También se cruza con [[Viejos y Jóvenes|old-young]] y [[BBW|bbw]] dependiendo de la creadora. Si MILF se sintió muy angosto, esta probablemente sea la página que realmente buscas.',
      ],
      topCreatorsIntro: 'Estas son las creadoras maduras que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Maduras vs. MILF — la red más ancha',
          paragraphs: [
            'Maduras es la categoría más amplia, honestamente, MILF se inclina hacia un personaje seguro específico, Maduras son solo creadoras mayores en general sin ese enfoque más angosto. Bastante cruce entre las dos, pero si quieres la búsqueda más amplia, esta es la categoría.',
            'Ninguna tiene un corte de edad estricto tampoco, es más sobre la onda general y presentación que un número exacto.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real, así que realmente se mueve en vez de quedarse estático.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Navegar está bien si tienes tiempo, pero si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero más rápido si ya sabes exactamente a quién buscas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuál es la diferencia entre Maduras y MILF?',
          answer: 'Maduras es la categoría más amplia, MILF se inclina hacia ese ángulo de personaje seguro específico. Bastantes creadoras se cruzan en las dos listas, pero Maduras tira una red más ancha.',
        },
        {
          question: '¿Hay un corte de edad para Maduras?',
          answer: 'No uno estricto, es más sobre la onda general y presentación que un número específico.',
        },
        {
          question: '¿Maduras se cruza con Viejos y Jóvenes?',
          answer: 'Sí, a veces, dependiendo de la creadora individual y el estilo de contenido. Vale la pena revisar ambas si eso es relevante para lo que buscas.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y verificación se actualizan cada 24 horas.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['milf', 'old-young', 'bbw', 'top', 'free'],
    },
  },

  indian: {
    en: {
      intro: [
        "Indian is a genuinely popular, active category here, real depth to the list, not some small side category. If that's specifically your thing, you've got plenty to browse.",
        "This list pulls creators actually ranking under Indian right now, based on real engagement, not some list nobody's touched in a while.",
      ],
      about: [
        '"Indian OnlyFans" covers creators from India or of Indian/Desi background, it\'s one of the more consistently searched nationality categories on the platform. It\'s a broader category too, not narrowed down by region within India, so expect some range once you\'re browsing.',
        'It overlaps with [[Asian|asian]] fairly often since Indian falls under that broader umbrella in some searches too, though we keep them as separate categories here since Indian gets searched specifically enough on its own.',
      ],
      topCreatorsIntro: 'These are the Indian creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A real, active category, not a niche afterthought',
          paragraphs: [
            "Indian creators have built a genuinely dedicated following on OnlyFans, this isn't some small side category tacked on, it's actively searched and actively growing. Expect real variety here too, style, presentation, content type all vary creator to creator.",
            'Nothing works differently behind the scenes either, same engagement-based ranking as everywhere else on the site.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card, no extra clicks.',
            "Ranking updates daily based on real engagement, so it's a genuinely live list.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but faster if you know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is Indian the same as Asian here?',
          answer: 'They overlap in some general searches, but we keep them as separate categories since Indian gets searched specifically enough on its own. Worth checking Asian too if you want a broader net.',
        },
        {
          question: 'Is this list narrowed down by region within India?',
          answer: 'No, it\'s one broad category, so expect a real range of backgrounds and styles rather than one specific region.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts specifically.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, pricing, and verification all refresh every 24 hours.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category here.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds.",
        },
      ],
      relatedSlugs: ['asian', 'latina', 'top', 'free'],
    },
    es: {
      intro: [
        'Indias es una categoría genuinamente popular y activa aquí, la lista tiene profundidad real, no es una categoría secundaria pequeña. Si eso es específicamente lo tuyo, tienes bastante para navegar.',
        'Esta lista junta a creadoras que están en Indias ahora mismo, según interacción real, no una lista que nadie toca hace rato.',
      ],
      about: [
        '"Indias OnlyFans" cubre creadoras de India o de origen indio/desi, es una de las categorías por nacionalidad más buscadas de forma constante en la plataforma. También es una categoría amplia, no acotada por región dentro de India, así que espera algo de rango una vez que navegues.',
        'Se cruza con [[Asiáticas|asian]] bastante seguido porque Indias cae dentro de ese paraguas más amplio en algunas búsquedas también, aunque las mantenemos como categorías separadas aquí porque Indias se busca lo suficientemente específico por su cuenta.',
      ],
      topCreatorsIntro: 'Estas son las creadoras indias que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una categoría real y activa, no un añadido de nicho',
          paragraphs: [
            'Las creadoras indias han construido un público genuinamente fiel en OnlyFans, esta no es una categoría secundaria pequeña pegada al final, se busca activamente y está creciendo. Espera variedad real también aquí, estilo, presentación, tipo de contenido varían de creadora a creadora.',
            'Nada funciona diferente detrás de cámaras tampoco, el mismo ranking basado en interacción que en todo el sitio.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta, sin clics extra.',
            'El ranking se actualiza a diario según interacción real, así que es una lista genuinamente viva.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero más rápido si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Indias es lo mismo que Asiáticas aquí?',
          answer: 'Se cruzan en algunas búsquedas generales, pero las mantenemos como categorías separadas porque Indias se busca lo suficientemente específico por su cuenta. Vale la pena revisar Asiáticas también si quieres una red más amplia.',
        },
        {
          question: '¿Esta lista está acotada por región dentro de India?',
          answer: 'No, es una categoría amplia, así que espera un rango real de orígenes y estilos en vez de una región específica.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0 específicamente.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y verificación se actualizan cada 24 horas.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías aquí.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['asian', 'latina', 'top', 'free'],
    },
  },

  korean: {
    en: {
      intro: [
        'Korean is one of the more specifically-searched nationality categories here, real demand, real depth to the list. If Asian felt too broad, this is the narrower version.',
        'This list pulls creators actually ranking under Korean right now, based on real engagement, not a stale snapshot.',
      ],
      about: [
        '"Korean OnlyFans" is exactly what it says, creators from or of Korean background, it\'s one of the narrower nationality categories we keep separate from the broader [[Asian|asian]] page since it genuinely gets searched enough on its own. K-pop and Korean beauty culture have made this a specifically in-demand look, not just a subset of a bigger category.',
        "Worth checking [[Japanese|japanese]] too if Korean's not quite it, the two get searched together a lot but they're separate, distinct categories here.",
      ],
      topCreatorsIntro: 'These are the Korean creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Why Korean gets its own page instead of just falling under Asian',
          paragraphs: [
            "Simple reason honestly, it gets searched specifically enough on its own to warrant a dedicated page rather than getting buried in the broader Asian list. Same logic applies to Japanese, both narrower and more focused than the general category.",
            "If you're after something broader instead, the Asian page covers a lot more ground.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            "Ranking updates daily based on real engagement, so it's a genuinely live list, not something stale.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but faster if you know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: 'Why is Korean separate from the Asian category?',
          answer: 'It gets searched specifically enough on its own to warrant a dedicated page instead of getting lost in the broader Asian list. Japanese works the same way.',
        },
        {
          question: "What's the difference between Korean and Japanese?",
          answer: 'Just nationality/background, that\'s the whole distinction. They get searched together a lot, but they\'re separate categories here.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts specifically.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, pricing, and verification all refresh every 24 hours.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category here.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds.",
        },
      ],
      relatedSlugs: ['japanese', 'asian', 'top', 'free'],
    },
    es: {
      intro: [
        'Coreanas es una de las categorías por nacionalidad más buscadas específicamente aquí, demanda real, profundidad real en la lista. Si Asiáticas se sintió muy amplio, esta es la versión más acotada.',
        'Esta lista junta a creadoras que están en Coreanas ahora mismo, según interacción real, no una foto vieja.',
      ],
      about: [
        '"Coreanas OnlyFans" es exactamente lo que dice, creadoras de origen coreano, es una de las categorías por nacionalidad más angostas que mantenemos separada de la página más amplia de [[Asiáticas|asian]] porque genuinamente se busca lo suficiente por su cuenta. El k-pop y la cultura de belleza coreana han hecho de este un look específicamente demandado, no solo un subconjunto de una categoría más grande.',
        'Vale la pena revisar [[Japonesas|japanese]] también si Coreanas no es exactamente lo tuyo, las dos se buscan juntas seguido pero son categorías separadas y distintas aquí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras coreanas que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Por qué Coreanas tiene su propia página en vez de caer bajo Asiáticas',
          paragraphs: [
            'Razón simple honestamente, se busca lo suficientemente específico por su cuenta como para justificar una página dedicada en vez de perderse en la lista más amplia de Asiáticas. La misma lógica aplica a Japonesas, ambas más angostas y enfocadas que la categoría general.',
            'Si buscas algo más amplio en cambio, la página de Asiáticas cubre mucho más terreno.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real, así que es una lista genuinamente viva, no algo desactualizado.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero más rápido si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Por qué Coreanas está separada de la categoría Asiáticas?',
          answer: 'Se busca lo suficientemente específico por su cuenta como para justificar una página dedicada en vez de perderse en la lista más amplia de Asiáticas. Japonesas funciona igual.',
        },
        {
          question: '¿Cuál es la diferencia entre Coreanas y Japonesas?',
          answer: 'Solo nacionalidad/origen, esa es toda la distinción. Se buscan juntas seguido, pero son categorías separadas aquí.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0 específicamente.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y verificación se actualizan cada 24 horas.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías aquí.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['japanese', 'asian', 'top', 'free'],
    },
  },

  japanese: {
    en: {
      intro: [
        "Japanese is a narrower, specifically-searched category here, real depth despite being more focused than the broader Asian page. If you know exactly what you're after, this is the more direct route.",
        "This list pulls creators actually ranking under Japanese right now, based on real engagement, not some list that's been sitting untouched.",
      ],
      about: [
        '"Japanese OnlyFans" covers creators from or of Japanese background, kept separate from the broader [[Asian|asian]] category since it gets searched specifically enough on its own to earn a dedicated page. It\'s a genuinely popular, consistently searched look on the platform.',
        "Worth checking [[Korean|korean]] too if Japanese isn't quite it, the two get searched together often but stay as separate categories here.",
      ],
      topCreatorsIntro: 'These are the Japanese creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A focused category, not the broad Asian search',
          paragraphs: [
            "This one's narrower on purpose, if you know specifically that you want Japanese, this page skips past the broader Asian list and gets you there directly. Same logic behind Korean having its own page too.",
            'Head to Asian instead if you want the wider net covering more nationalities and backgrounds.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            "Ranking updates daily based on real engagement, so it's genuinely live.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but faster if you know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: 'Why is Japanese separate from Asian here?',
          answer: 'It gets searched specifically enough on its own to earn a dedicated page instead of getting buried in the broader Asian list.',
        },
        {
          question: "What's the difference between Japanese and Korean?",
          answer: 'Just nationality/background, that\'s the whole distinction. They get searched together often, but stay separate categories here.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts specifically.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, pricing, and verification all refresh every 24 hours.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category here.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds.",
        },
      ],
      relatedSlugs: ['korean', 'asian', 'top', 'free'],
    },
    es: {
      intro: [
        'Japonesas es una categoría más angosta y buscada específicamente aquí, profundidad real a pesar de ser más enfocada que la página más amplia de Asiáticas. Si ya sabes exactamente qué buscas, esta es la ruta más directa.',
        'Esta lista junta a creadoras que están en Japonesas ahora mismo, según interacción real, no una lista que nadie toca.',
      ],
      about: [
        '"Japonesas OnlyFans" cubre creadoras de origen japonés, se mantiene separada de la categoría más amplia de [[Asiáticas|asian]] porque se busca lo suficientemente específico por su cuenta como para merecer una página dedicada. Es un look genuinamente popular y buscado de forma constante en la plataforma.',
        'Vale la pena revisar [[Coreanas|korean]] también si Japonesas no es exactamente lo tuyo, las dos se buscan juntas seguido pero se mantienen como categorías separadas aquí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras japonesas que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una categoría enfocada, no la búsqueda amplia de Asiáticas',
          paragraphs: [
            'Esta es más angosta a propósito, si ya sabes específicamente que quieres Japonesas, esta página te salta la lista más amplia de Asiáticas y te lleva directo. La misma lógica hace que Coreanas tenga su propia página también.',
            'Ve a Asiáticas en cambio si quieres la red más amplia que cubre más nacionalidades y orígenes.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real, así que es genuinamente viva.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero más rápido si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Por qué Japonesas está separada de Asiáticas aquí?',
          answer: 'Se busca lo suficientemente específico por su cuenta como para merecer una página dedicada en vez de perderse en la lista más amplia de Asiáticas.',
        },
        {
          question: '¿Cuál es la diferencia entre Japonesas y Coreanas?',
          answer: 'Solo nacionalidad/origen, esa es toda la distinción. Se buscan juntas seguido, pero se mantienen como categorías separadas aquí.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0 específicamente.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y verificación se actualizan cada 24 horas.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías aquí.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['korean', 'asian', 'top', 'free'],
    },
  },

  greek: {
    en: {
      intro: [
        "Greek is a smaller, more specific nationality category here, genuinely dedicated search demand even if the list runs leaner than some of the bigger categories. Every creator here actually fits it.",
        'This list pulls creators actually ranking under Greek right now, based on real engagement, not a stale snapshot.',
      ],
      about: [
        '"Greek OnlyFans" covers creators of Greek/Hellenic background, it\'s one of several nationality-specific categories on the site alongside [[Italian|italian]], [[Dutch|dutch]], and [[Serbian|serbian]]. These smaller nationality categories exist because people do search for them specifically, even if the pool of creators is naturally smaller than a broader category.',
        "If you're not finding exactly what you want here, those related nationality pages are worth a look too.",
      ],
      topCreatorsIntro: 'These are the Greek creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Why this list runs smaller than the bigger categories',
          paragraphs: [
            'Straightforward reason, Greek creators on OnlyFans are just a smaller pool than broader categories like Latina or Asian, so the list reflects that. Everyone here actually fits the category though, not padded out with close matches.',
            "Worth checking back regularly since new creators do get added, even if it moves slower than some of the bigger lists.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but faster if you know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: 'Why is this list smaller than some other nationality categories?',
          answer: 'Just a smaller pool of creators genuinely tagged Greek compared to broader categories. Everyone listed actually fits it though, nothing padded out.',
        },
        {
          question: 'Are there other nationality-specific categories like this one?',
          answer: 'Yeah, Italian, Dutch, and Serbian are set up the same way, dedicated pages for nationalities that get searched specifically enough on their own.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts specifically.',
        },
        {
          question: 'How often does this list update?',
          answer: "Daily, though because the pool's smaller, changes might feel less dramatic week to week.",
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category here.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds.",
        },
      ],
      relatedSlugs: ['italian', 'dutch', 'serbian', 'top', 'free'],
    },
    es: {
      intro: [
        'Griegas es una categoría por nacionalidad más chica y específica aquí, demanda de búsqueda genuinamente dedicada aunque la lista sea más delgada que algunas categorías grandes. Cada creadora aquí realmente encaja.',
        'Esta lista junta a creadoras que están en Griegas ahora mismo, según interacción real, no una foto vieja.',
      ],
      about: [
        '"Griegas OnlyFans" cubre creadoras de origen griego/helénico, es una de varias categorías por nacionalidad específica del sitio junto con [[Italianas|italian]], [[Holandesas|dutch]] y [[Serbias|serbian]]. Estas categorías por nacionalidad más chicas existen porque la gente sí las busca específicamente, aunque el grupo de creadoras sea naturalmente más chico que una categoría amplia.',
        'Si no encuentras exactamente lo que buscas aquí, esas páginas de nacionalidad relacionadas también vale la pena revisarlas.',
      ],
      topCreatorsIntro: 'Estas son las creadoras griegas que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Por qué esta lista es más chica que las categorías grandes',
          paragraphs: [
            'Razón directa, las creadoras griegas en OnlyFans son simplemente un grupo más chico que categorías amplias como Latinas o Asiáticas, así que la lista lo refleja. Eso sí, todas aquí realmente encajan en la categoría, no rellenas con parecidos.',
            'Vale la pena revisar seguido porque sí se agregan creadoras nuevas, aunque se mueva más lento que algunas listas grandes.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero más rápido si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Por qué esta lista es más chica que otras categorías por nacionalidad?',
          answer: 'Simplemente un grupo más chico de creadoras genuinamente etiquetadas como Griegas comparado con categorías amplias. Eso sí, todas las que aparecen realmente encajan, nada relleno.',
        },
        {
          question: '¿Hay otras categorías por nacionalidad específica como esta?',
          answer: 'Sí, Italianas, Holandesas y Serbias están armadas de la misma forma, páginas dedicadas para nacionalidades que se buscan lo suficientemente específico por su cuenta.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0 específicamente.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, aunque como el grupo es más chico, los cambios pueden sentirse menos dramáticos semana a semana.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías aquí.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['italian', 'dutch', 'serbian', 'top', 'free'],
    },
  },

  serbian: {
    en: {
      intro: [
        'Serbian is one of the more specific nationality categories here, real dedicated search demand, leaner list than the bigger categories but every creator here actually fits it.',
        'This list pulls creators actually ranking under Serbian right now, based on real engagement, not a stale snapshot.',
      ],
      about: [
        '"Serbian OnlyFans" covers creators of Serbian/Balkan background, it\'s one of several nationality-specific pages on the site alongside [[Greek|greek]], [[Italian|italian]], and [[Dutch|dutch]]. These exist because people genuinely search for them by name, even with a naturally smaller pool of creators than a broader category.',
        "Worth checking those related nationality pages too if you're not finding exactly what you want here.",
      ],
      topCreatorsIntro: 'These are the Serbian creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Why this list runs smaller than the bigger categories',
          paragraphs: [
            'Same story as the other nationality-specific pages, the pool of creators genuinely tagged Serbian is smaller than broader categories, so the list reflects that honestly. Everyone here actually fits it though.',
            'New creators do get added over time, it just moves slower than some of the bigger lists.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but faster if you know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: 'Why is this list smaller than some other categories?',
          answer: 'Genuinely a smaller pool of creators tagged Serbian compared to broader categories. Everyone listed actually fits it, nothing padded out.',
        },
        {
          question: 'Are there other nationality-specific pages like this one?',
          answer: 'Yeah, Greek, Italian, and Dutch work the same way, dedicated pages for nationalities searched specifically enough on their own.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts specifically.',
        },
        {
          question: 'How often does this list update?',
          answer: "Daily, though because the pool's smaller, changes might feel less dramatic week to week.",
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category here.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds.",
        },
      ],
      relatedSlugs: ['greek', 'italian', 'dutch', 'top', 'free'],
    },
    es: {
      intro: [
        'Serbias es una de las categorías por nacionalidad más específicas aquí, demanda de búsqueda genuinamente dedicada, lista más delgada que las categorías grandes pero cada creadora aquí realmente encaja.',
        'Esta lista junta a creadoras que están en Serbias ahora mismo, según interacción real, no una foto vieja.',
      ],
      about: [
        '"Serbias OnlyFans" cubre creadoras de origen serbio/balcánico, es una de varias páginas por nacionalidad específica del sitio junto con [[Griegas|greek]], [[Italianas|italian]] y [[Holandesas|dutch]]. Estas existen porque la gente realmente las busca por nombre, aunque el grupo de creadoras sea naturalmente más chico que una categoría amplia.',
        'Vale la pena revisar esas páginas de nacionalidad relacionadas también si no encuentras exactamente lo que buscas aquí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras serbias que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Por qué esta lista es más chica que las categorías grandes',
          paragraphs: [
            'Misma historia que las otras páginas por nacionalidad específica, el grupo de creadoras genuinamente etiquetadas como Serbias es más chico que categorías amplias, así que la lista lo refleja honestamente. Eso sí, todas aquí realmente encajan.',
            'Sí se agregan creadoras nuevas con el tiempo, solo que se mueve más lento que algunas listas grandes.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero más rápido si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Por qué esta lista es más chica que otras categorías?',
          answer: 'Genuinamente un grupo más chico de creadoras etiquetadas como Serbias comparado con categorías amplias. Todas las que aparecen realmente encajan, nada relleno.',
        },
        {
          question: '¿Hay otras páginas por nacionalidad específica como esta?',
          answer: 'Sí, Griegas, Italianas y Holandesas funcionan igual.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0 específicamente.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, aunque como el grupo es más chico, los cambios pueden sentirse menos dramáticos semana a semana.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías aquí.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['greek', 'italian', 'dutch', 'top', 'free'],
    },
  },

  italian: {
    en: {
      intro: [
        'Italian is a specific nationality category here, genuinely searched by name, leaner list than the bigger categories but every creator here actually fits it.',
        'This list pulls creators actually ranking under Italian right now, based on real engagement, not a stale snapshot.',
      ],
      about: [
        '"Italian OnlyFans" covers creators of Italian background, one of several nationality-specific pages here alongside [[Greek|greek]], [[Dutch|dutch]], and [[Serbian|serbian]]. These smaller categories exist because people genuinely search for them specifically, even with a naturally smaller creator pool than a broad category like Latina or Asian.',
        "Worth checking those related pages too if you're not finding exactly what you want here.",
      ],
      topCreatorsIntro: 'These are the Italian creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Why this list runs smaller than the bigger categories',
          paragraphs: [
            'Straightforward, the pool of creators genuinely tagged Italian is smaller than broader categories, so the list reflects that. Everyone here actually fits it though, not padded out with close matches.',
            'New creators get added over time, it just moves a bit slower than some of the bigger lists.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but faster if you know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: 'Why is this list smaller than some other categories?',
          answer: 'Genuinely a smaller pool of creators tagged Italian compared to broader categories. Everyone listed actually fits it.',
        },
        {
          question: 'Are there other nationality-specific pages like this one?',
          answer: 'Yeah, Greek, Dutch, and Serbian work the same way.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts specifically.',
        },
        {
          question: 'How often does this list update?',
          answer: "Daily, though because the pool's smaller, changes might feel less dramatic week to week.",
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category here.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds.",
        },
      ],
      relatedSlugs: ['greek', 'dutch', 'serbian', 'top', 'free'],
    },
    es: {
      intro: [
        'Italianas es una categoría por nacionalidad específica aquí, genuinamente buscada por nombre, lista más delgada que las categorías grandes pero cada creadora aquí realmente encaja.',
        'Esta lista junta a creadoras que están en Italianas ahora mismo, según interacción real, no una foto vieja.',
      ],
      about: [
        '"Italianas OnlyFans" cubre creadoras de origen italiano, una de varias páginas por nacionalidad específica aquí junto con [[Griegas|greek]], [[Holandesas|dutch]] y [[Serbias|serbian]]. Estas categorías más chicas existen porque la gente realmente las busca específicamente, aunque el grupo de creadoras sea naturalmente más chico que una categoría amplia como Latinas o Asiáticas.',
        'Vale la pena revisar esas páginas relacionadas también si no encuentras exactamente lo que buscas aquí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras italianas que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Por qué esta lista es más chica que las categorías grandes',
          paragraphs: [
            'Directo, el grupo de creadoras genuinamente etiquetadas como Italianas es más chico que categorías amplias, así que la lista lo refleja. Eso sí, todas aquí realmente encajan, no rellenas con parecidos.',
            'Se agregan creadoras nuevas con el tiempo, solo que se mueve un poco más lento que algunas listas grandes.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero más rápido si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Por qué esta lista es más chica que otras categorías?',
          answer: 'Genuinamente un grupo más chico de creadoras etiquetadas como Italianas comparado con categorías amplias. Todas las que aparecen realmente encajan.',
        },
        {
          question: '¿Hay otras páginas por nacionalidad específica como esta?',
          answer: 'Sí, Griegas, Holandesas y Serbias funcionan igual.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0 específicamente.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, aunque como el grupo es más chico, los cambios pueden sentirse menos dramáticos semana a semana.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías aquí.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['greek', 'dutch', 'serbian', 'top', 'free'],
    },
  },

  dutch: {
    en: {
      intro: [
        'Dutch is a specific nationality category here, genuinely searched by name, leaner list than the bigger categories but every creator here actually fits it.',
        'This list pulls creators actually ranking under Dutch right now, based on real engagement, not a stale snapshot.',
      ],
      about: [
        '"Dutch OnlyFans" covers creators from the Netherlands or of Dutch background, one of several nationality-specific pages here alongside [[Greek|greek]], [[Italian|italian]], and [[Serbian|serbian]]. These smaller categories exist because people genuinely search for them specifically, even with a naturally smaller creator pool than a broad category.',
        "Worth checking those related pages too if you're not finding exactly what you want here.",
      ],
      topCreatorsIntro: 'These are the Dutch creators actually leading the category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Why this list runs smaller than the bigger categories',
          paragraphs: [
            'Same story as the other nationality-specific pages, the pool of creators genuinely tagged Dutch is smaller than broader categories, so the list reflects that honestly. Everyone here actually fits it though.',
            'New creators get added over time, it just moves a bit slower than some of the bigger lists.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but faster if you know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: 'Why is this list smaller than some other categories?',
          answer: 'Genuinely a smaller pool of creators tagged Dutch compared to broader categories. Everyone listed actually fits it.',
        },
        {
          question: 'Are there other nationality-specific pages like this one?',
          answer: 'Yeah, Greek, Italian, and Serbian work the same way.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts specifically.',
        },
        {
          question: 'How often does this list update?',
          answer: "Daily, though because the pool's smaller, changes might feel less dramatic week to week.",
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category here.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds.",
        },
      ],
      relatedSlugs: ['greek', 'italian', 'serbian', 'top', 'free'],
    },
    es: {
      intro: [
        'Holandesas es una categoría por nacionalidad específica aquí, genuinamente buscada por nombre, lista más delgada que las categorías grandes pero cada creadora aquí realmente encaja.',
        'Esta lista junta a creadoras que están en Holandesas ahora mismo, según interacción real, no una foto vieja.',
      ],
      about: [
        '"Holandesas OnlyFans" cubre creadoras de los Países Bajos o de origen holandés, una de varias páginas por nacionalidad específica aquí junto con [[Griegas|greek]], [[Italianas|italian]] y [[Serbias|serbian]]. Estas categorías más chicas existen porque la gente realmente las busca específicamente, aunque el grupo de creadoras sea naturalmente más chico que una categoría amplia.',
        'Vale la pena revisar esas páginas relacionadas también si no encuentras exactamente lo que buscas aquí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras holandesas que realmente van a la cabeza de la categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Por qué esta lista es más chica que las categorías grandes',
          paragraphs: [
            'Misma historia que las otras páginas por nacionalidad específica, el grupo de creadoras genuinamente etiquetadas como Holandesas es más chico que categorías amplias, así que la lista lo refleja honestamente. Eso sí, todas aquí realmente encajan.',
            'Se agregan creadoras nuevas con el tiempo, solo que se mueve un poco más lento que algunas listas grandes.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero más rápido si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Por qué esta lista es más chica que otras categorías?',
          answer: 'Genuinamente un grupo más chico de creadoras etiquetadas como Holandesas comparado con categorías amplias. Todas las que aparecen realmente encajan.',
        },
        {
          question: '¿Hay otras páginas por nacionalidad específica como esta?',
          answer: 'Sí, Griegas, Italianas y Serbias funcionan igual.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0 específicamente.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, aunque como el grupo es más chico, los cambios pueden sentirse menos dramáticos semana a semana.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías aquí.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['greek', 'italian', 'serbian', 'top', 'free'],
    },
  },

  blowjob: {
    en: {
      intro: [
        "Blowjob is a content-type category here, not appearance-based, so expect creators who specifically post that kind of content rather than one particular look. Real depth to this list too.",
        "This list pulls creators actually getting picked as Blowjob right now, based on real engagement, not some list nobody's touched in a while.",
      ],
      about: [
        '"Blowjob OnlyFans" is a content-type category, it\'s about what a creator posts rather than how they look, so you\'ll see a real range of appearances and styles here. It overlaps naturally with [[Pussy Licking|pussy-licking]] since both are oral-content categories, and with [[Bukkake|bukkake]] for creators who post both.',
        "Worth being upfront that findbyface ranks and links out to creators based on profile signals, we don't host or verify the content itself, that lives on OnlyFans.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the Blowjob category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A content category, not an appearance one',
          paragraphs: [
            "This list isn't filtered by look at all, it's purely about content type, so expect real variety in appearance, ethnicity, body type, all of it. The common thread is just the content style.",
            'That also means it overlaps with basically every other category here depending on the individual creator.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid accounts together, verified badges on some, bundle deals popping up now and then. Price and verification sit right on the card.',
            "Ranking updates daily based on real engagement, so it's a genuinely live list.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Worth noting face search matches faces, not content type, so it won't filter by content category on its own.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is this category filtered by appearance?',
          answer: "No, it's purely content-type based, so you'll see a real range of looks. The common thread is just what creators post, not how they look.",
        },
        {
          question: 'Does findbyface host this content?',
          answer: "No, we rank and link out to creator profiles based on engagement, the actual content lives on OnlyFans. We don't host or verify it ourselves.",
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category here.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way. Verification isn't part of the ranking.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts specifically.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily. New accounts, pricing, and verification all refresh every 24 hours.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search and it'll rank creators by how close they actually look, usually in under 2 seconds, though it won't filter by content type.",
        },
      ],
      relatedSlugs: ['pussy-licking', 'bukkake', 'top', 'free'],
    },
    es: {
      intro: [
        'Mamadas es una categoría por tipo de contenido aquí, no por apariencia, así que espera creadoras que específicamente publican ese tipo de contenido en vez de un look particular. Bastante profundidad en esta lista también.',
        'Esta lista junta a creadoras que están siendo elegidas como Mamadas ahora mismo, según interacción real, no una lista que nadie toca hace rato.',
      ],
      about: [
        '"Mamadas OnlyFans" es una categoría por tipo de contenido, es sobre qué publica una creadora más que cómo se ve, así que vas a ver un rango real de apariencias y estilos aquí. Se cruza naturalmente con [[Cunnilingus|pussy-licking]] porque ambas son categorías de contenido oral, y con [[Bukkake|bukkake]] para creadoras que publican ambas cosas.',
        'Vale la pena ser honestos, findbyface clasifica y enlaza a creadoras según señales de perfil, no alojamos ni verificamos el contenido en sí, eso vive en OnlyFans.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Mamadas ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una categoría de contenido, no de apariencia',
          paragraphs: [
            'Esta lista no está filtrada por look para nada, es puramente sobre tipo de contenido, así que espera variedad real en apariencia, etnia, tipo de cuerpo, todo. El hilo conductor es solo el estilo de contenido.',
            'Eso también significa que se cruza con básicamente todas las otras categorías aquí dependiendo de la creadora individual.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, cuentas gratis y de pago juntas, algunas con insignia de verificadas, packs apareciendo de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real, así que es una lista genuinamente viva.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Vale la pena aclarar que la búsqueda facial compara caras, no tipo de contenido, así que no va a filtrar por categoría de contenido por sí sola.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Esta categoría está filtrada por apariencia?',
          answer: 'No, es puramente basada en tipo de contenido, así que vas a ver un rango real de looks. El hilo conductor es solo qué publican las creadoras, no cómo se ven.',
        },
        {
          question: '¿findbyface aloja este contenido?',
          answer: 'No, nosotros clasificamos y enlazamos a perfiles de creadoras según interacción, el contenido en sí vive en OnlyFans. No lo alojamos ni lo verificamos nosotros.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías aquí.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos. La verificación no es parte del ranking.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0 específicamente.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario. Cuentas nuevas, precios y verificación se actualizan cada 24 horas.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial y va a ordenar a las creadoras por qué tanto se parecen, normalmente en menos de 2 segundos, aunque no va a filtrar por tipo de contenido.',
        },
      ],
      relatedSlugs: ['pussy-licking', 'bukkake', 'top', 'free'],
    },
  },

  'pussy-licking': {
    en: {
      intro: [
        "Pussy Licking is a content-type category here, same deal as our other act-focused categories, it's about what's posted, not one specific look. Real depth to this list.",
        'This list pulls creators actually getting picked for Pussy Licking content right now, based on real engagement.',
      ],
      about: [
        '"Pussy Licking OnlyFans" is a content-type category, not an appearance one, so expect a real range of looks across this list. It overlaps naturally with [[Blowjob|blowjob]] since both are oral-content categories, plenty of creators post both.',
        "Same disclosure as every content-type category here, findbyface ranks and links to creator profiles based on engagement signals, we don't host or verify the actual content, that's on OnlyFans.",
      ],
      topCreatorsIntro: 'These are the creators actually leading this category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A content category, not an appearance one',
          paragraphs: [
            'No filtering by look here at all, it\'s purely about content type, so expect real variety across ethnicity, body type, everything. The shared thread is just the content style.',
            'That means it crosses over with basically every other category depending on the individual creator.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification are right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "It matches faces, not content type, so it won't filter by category on its own.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is this category filtered by appearance?',
          answer: 'No, purely content-type based. You\'ll see a real range of looks, the common thread is just what\'s posted.',
        },
        {
          question: 'Does findbyface host this content?',
          answer: 'No, we rank and link to profiles based on engagement, the content itself lives on OnlyFans.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search, usually under 2 seconds, though it won't filter by content type.",
        },
      ],
      relatedSlugs: ['blowjob', 'rough-sex', 'top', 'free'],
    },
    es: {
      intro: [
        'Cunnilingus es una categoría por tipo de contenido aquí, igual que nuestras otras categorías enfocadas en actos, es sobre qué se publica, no un look específico. Bastante profundidad en esta lista.',
        'Esta lista junta a creadoras que están siendo elegidas para contenido de Cunnilingus ahora mismo, según interacción real.',
      ],
      about: [
        '"Cunnilingus OnlyFans" es una categoría por tipo de contenido, no de apariencia, así que espera un rango real de looks en esta lista. Se cruza naturalmente con [[Mamadas|blowjob]] porque ambas son categorías de contenido oral, bastantes creadoras publican las dos.',
        'Misma aclaración que toda categoría de contenido aquí, findbyface clasifica y enlaza a perfiles de creadoras según señales de interacción, no alojamos ni verificamos el contenido en sí, eso está en OnlyFans.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de esta categoría ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una categoría de contenido, no de apariencia',
          paragraphs: [
            'Sin filtro por look aquí para nada, es puramente sobre tipo de contenido, así que espera variedad real en etnia, tipo de cuerpo, todo. El hilo compartido es solo el estilo de contenido.',
            'Eso significa que se cruza con básicamente todas las demás categorías dependiendo de la creadora individual.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Compara caras, no tipo de contenido, así que no va a filtrar por categoría por sí sola.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Esta categoría está filtrada por apariencia?',
          answer: 'No, puramente basada en tipo de contenido. Vas a ver un rango real de looks, el hilo conductor es solo qué se publica.',
        },
        {
          question: '¿findbyface aloja este contenido?',
          answer: 'No, clasificamos y enlazamos a perfiles según interacción, el contenido en sí vive en OnlyFans.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial, normalmente en menos de 2 segundos, aunque no va a filtrar por tipo de contenido.',
        },
      ],
      relatedSlugs: ['blowjob', 'rough-sex', 'top', 'free'],
    },
  },

  footjob: {
    en: {
      intro: [
        'Footjob is a specific content-type category here, separate from our broader Feet category but closely related. If that\'s specifically your thing, this list has real depth.',
        'This list pulls creators actually getting picked for Footjob content right now, based on real engagement.',
      ],
      about: [
        '"Footjob OnlyFans" is about that specific act, kept separate from our broader [[Feet|feet]] category which is more about photo/video content of feet themselves. A lot of creators do both and cross-list, but they\'re distinct categories here.',
        "Same disclosure as every content-type category, findbyface ranks and links to profiles based on engagement, we don't host or verify the content itself.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the Footjob category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Footjob vs. Feet — worth knowing the difference',
          paragraphs: [
            "Quick clarification, Footjob is about that specific act, Feet is more general photo/video content of feet themselves. Some creators do both, plenty only do one, so check the right category instead of assuming.",
            "If you're not finding exactly what you want here, the broader Feet category is worth a look too.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then, plus a lot of creators here do custom requests too. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "Our face search is built around faces, not this specific content type, so it won't filter by content category, just being upfront. It's more useful if you've got a specific creator's face in mind.",
            'Otherwise browsing this list directly and checking bios is the more direct route.',
          ],
        },
      ],
      faq: [
        {
          question: 'What\'s the difference between Footjob and Feet?',
          answer: 'Footjob is about that specific act, Feet is broader photo/video content of feet themselves. They overlap but are separate categories.',
        },
        {
          question: 'Does findbyface host this content?',
          answer: 'No, we rank and link to profiles based on engagement, the content lives on OnlyFans.',
        },
        {
          question: 'Do creators here do custom requests?',
          answer: "A lot of them, yeah, similar to the Feet category. Worth checking a creator's bio or messaging directly.",
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
      ],
      relatedSlugs: ['feet', 'bondage', 'top', 'free'],
    },
    es: {
      intro: [
        'Footjob es una categoría por tipo de contenido específica aquí, separada de nuestra categoría más amplia de Pies pero muy relacionada. Si eso es específicamente lo tuyo, esta lista tiene profundidad real.',
        'Esta lista junta a creadoras que están siendo elegidas para contenido de Footjob ahora mismo, según interacción real.',
      ],
      about: [
        '"Footjob OnlyFans" es sobre ese acto específico, se mantiene separada de nuestra categoría más amplia de [[Pies|feet]] que es más sobre contenido de foto/video de los pies en sí. Muchas creadoras hacen ambas cosas y se cruzan, pero son categorías distintas aquí.',
        'Misma aclaración que toda categoría de contenido, findbyface clasifica y enlaza a perfiles según interacción, no alojamos ni verificamos el contenido en sí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Footjob ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Footjob vs. Pies — vale la pena saber la diferencia',
          paragraphs: [
            'Aclaración rápida, Footjob es sobre ese acto específico, Pies es más contenido general de foto/video de los pies en sí. Algunas creadoras hacen ambas cosas, muchas solo una, así que revisa la categoría correcta en vez de asumir.',
            'Si no encuentras exactamente lo que buscas aquí, la categoría más amplia de Pies también vale la pena revisarla.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando, además muchas creadoras aquí hacen pedidos personalizados también. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Nuestra búsqueda facial está armada para caras, no para este tipo de contenido específico, así que no va a filtrar por categoría de contenido, siendo honestos. Es más útil si ya tienes la cara de una creadora específica en mente.',
            'Fuera de eso, navegar esta lista directamente y revisar bios es la ruta más directa.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuál es la diferencia entre Footjob y Pies?',
          answer: 'Footjob es sobre ese acto específico, Pies es contenido más amplio de foto/video de los pies en sí. Se cruzan pero son categorías separadas.',
        },
        {
          question: '¿findbyface aloja este contenido?',
          answer: 'No, clasificamos y enlazamos a perfiles según interacción, el contenido vive en OnlyFans.',
        },
        {
          question: '¿Las creadoras aquí hacen pedidos personalizados?',
          answer: 'Bastantes sí, similar a la categoría Pies. Vale la pena revisar la bio de la creadora o escribirle directo.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
      ],
      relatedSlugs: ['feet', 'bondage', 'top', 'free'],
    },
  },

  bbc: {
    en: {
      intro: [
        'BBC is a content/act-focused category here, kept separate from Ebony which is about appearance. Real depth to this list, genuinely active search demand.',
        'This list pulls creators actually getting picked for BBC content right now, based on real engagement.',
      ],
      about: [
        '"BBC OnlyFans" is built around a specific act/content focus, not appearance, kept distinct from our [[Ebony|ebony]] category which is about Black creators generally. They\'re related but not the same thing, not every creator in one shows up in the other.',
        "Same disclosure as every content-type category here, findbyface ranks and links to profiles based on engagement signals, we don't host or verify the content itself.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the BBC category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'BBC vs. Ebony — worth clearing up',
          paragraphs: [
            'These two get mixed up sometimes, BBC is content/act-focused here, Ebony is about appearance, Black creators generally. Not every Ebony creator does BBC content and not every BBC-tagged profile is necessarily Ebony.',
            "Check the right category if you're after one specifically instead of assuming they're the same thing.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "It matches faces, not content type, so it won't filter by category on its own.",
          ],
        },
      ],
      faq: [
        {
          question: "What's the difference between BBC and Ebony?",
          answer: "BBC is content/act-focused, Ebony is about appearance, Black creators generally. They're related but separate categories, not every creator overlaps both.",
        },
        {
          question: 'Does findbyface host this content?',
          answer: 'No, we rank and link to profiles based on engagement, the content lives on OnlyFans.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: "Yeah, upload a photo to our face search, usually under 2 seconds, though it won't filter by content type.",
        },
      ],
      relatedSlugs: ['ebony', 'rough-sex', 'top', 'free'],
    },
    es: {
      intro: [
        'BBC es una categoría enfocada en contenido/acto aquí, se mantiene separada de Ebony que es sobre apariencia. Profundidad real en esta lista, demanda de búsqueda genuinamente activa.',
        'Esta lista junta a creadoras que están siendo elegidas para contenido BBC ahora mismo, según interacción real.',
      ],
      about: [
        '"BBC OnlyFans" está armada alrededor de un enfoque de acto/contenido específico, no apariencia, se mantiene distinta de nuestra categoría [[Ebony|ebony]] que es sobre creadoras negras en general. Están relacionadas pero no son lo mismo, no toda creadora de una aparece en la otra.',
        'Misma aclaración que toda categoría de contenido aquí, findbyface clasifica y enlaza a perfiles según señales de interacción, no alojamos ni verificamos el contenido en sí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría BBC ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'BBC vs. Ebony — vale la pena aclararlo',
          paragraphs: [
            'Estas dos se confunden a veces, BBC está enfocada en contenido/acto aquí, Ebony es sobre apariencia, creadoras negras en general. No todas las creadoras Ebony hacen contenido BBC y no todo perfil etiquetado BBC es necesariamente Ebony.',
            'Revisa la categoría correcta si buscas específicamente una en vez de asumir que son lo mismo.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Compara caras, no tipo de contenido, así que no va a filtrar por categoría por sí sola.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuál es la diferencia entre BBC y Ebony?',
          answer: 'BBC está enfocada en contenido/acto, Ebony es sobre apariencia, creadoras negras en general. Están relacionadas pero son categorías separadas, no toda creadora se cruza en ambas.',
        },
        {
          question: '¿findbyface aloja este contenido?',
          answer: 'No, clasificamos y enlazamos a perfiles según interacción, el contenido vive en OnlyFans.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial, normalmente en menos de 2 segundos, aunque no va a filtrar por tipo de contenido.',
        },
      ],
      relatedSlugs: ['ebony', 'rough-sex', 'top', 'free'],
    },
  },

  anal: {
    en: {
      intro: [
        "Anal is a content-type category here, genuinely one of the more consistently searched ones, real depth to this list. It's about what's posted, not appearance.",
        'This list pulls creators actually getting picked for Anal content right now, based on real engagement.',
      ],
      about: [
        '"Anal OnlyFans" is a content-type category, not appearance-based, so expect a real range of looks across this list. It overlaps naturally with [[Rough Sex|rough-sex]] and [[Bondage|bondage]] since these content types often show up together on the same profiles.',
        "Worth being upfront that findbyface ranks and links to creators based on engagement, we don't host or verify the content itself, that's on OnlyFans.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the Anal category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A content category, not an appearance one',
          paragraphs: [
            "This list isn't filtered by look, it's purely about content type, so expect real variety in appearance across the board. The shared thread is just what's posted.",
            "That means it overlaps with a lot of other categories depending on the individual creator's full content mix.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "It matches faces, not content type, so it won't filter by category on its own.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is this category filtered by appearance?',
          answer: "No, purely content-type based. You'll see a real range of looks, the common thread is just what's posted.",
        },
        {
          question: 'Does findbyface host this content?',
          answer: "No, we rank and link to profiles based on engagement, the content lives on OnlyFans, we don't host or verify it.",
        },
        {
          question: 'Does this overlap with Rough Sex or Bondage?',
          answer: 'Yeah, pretty often, these content types tend to show up together on the same profiles. Worth checking those too.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
      ],
      relatedSlugs: ['rough-sex', 'bondage', 'blowjob', 'top', 'free'],
    },
    es: {
      intro: [
        'Anal es una categoría por tipo de contenido aquí, genuinamente una de las más buscadas de forma constante, profundidad real en esta lista. Es sobre qué se publica, no apariencia.',
        'Esta lista junta a creadoras que están siendo elegidas para contenido Anal ahora mismo, según interacción real.',
      ],
      about: [
        '"Anal OnlyFans" es una categoría por tipo de contenido, no basada en apariencia, así que espera un rango real de looks en esta lista. Se cruza naturalmente con [[Sexo Duro|rough-sex]] y [[Bondage|bondage]] porque estos tipos de contenido suelen aparecer juntos en los mismos perfiles.',
        'Vale la pena ser honestos, findbyface clasifica y enlaza a creadoras según interacción, no alojamos ni verificamos el contenido en sí, eso está en OnlyFans.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Anal ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una categoría de contenido, no de apariencia',
          paragraphs: [
            'Esta lista no está filtrada por look, es puramente sobre tipo de contenido, así que espera variedad real en apariencia en general. El hilo compartido es solo qué se publica.',
            'Eso significa que se cruza con muchas otras categorías dependiendo de la mezcla completa de contenido de cada creadora.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Compara caras, no tipo de contenido, así que no va a filtrar por categoría por sí sola.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Esta categoría está filtrada por apariencia?',
          answer: 'No, puramente basada en tipo de contenido. Vas a ver un rango real de looks, el hilo conductor es solo qué se publica.',
        },
        {
          question: '¿findbyface aloja este contenido?',
          answer: 'No, clasificamos y enlazamos a perfiles según interacción, el contenido vive en OnlyFans, no lo alojamos ni lo verificamos.',
        },
        {
          question: '¿Esto se cruza con Sexo Duro o Bondage?',
          answer: 'Sí, bastante seguido, estos tipos de contenido suelen aparecer juntos en los mismos perfiles. Vale la pena revisar esas también.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
      ],
      relatedSlugs: ['rough-sex', 'bondage', 'blowjob', 'top', 'free'],
    },
  },

  bondage: {
    en: {
      intro: [
        'Bondage is a content-type category here, real dedicated search demand, genuine depth to this list. It\'s about content style, not appearance.',
        'This list pulls creators actually getting picked for Bondage content right now, based on real engagement.',
      ],
      about: [
        '"Bondage OnlyFans" is a content-type category built around BDSM-style content, restraint, power dynamics, that kind of thing, rather than one specific look. It overlaps naturally with [[Strap On|strap-on]] and [[Rough Sex|rough-sex]] since these content styles often go together.',
        "Same disclosure as every content-type category here, findbyface ranks and links to profiles based on engagement, we don't host or verify the content itself.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the Bondage category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A content category, not an appearance one',
          paragraphs: [
            "No appearance filtering here, it's purely about content style, so expect real variety in looks. The shared thread is just the BDSM/bondage content focus.",
            "It overlaps with a handful of related categories depending on each creator's full content mix.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "It matches faces, not content type, so it won't filter by category on its own.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is this category filtered by appearance?',
          answer: "No, purely content-type based, built around BDSM-style content. You'll see a real range of looks.",
        },
        {
          question: 'Does findbyface host this content?',
          answer: 'No, we rank and link to profiles based on engagement, the content lives on OnlyFans.',
        },
        {
          question: 'Does this overlap with Strap On or Rough Sex?',
          answer: 'Yeah, pretty often, these content styles tend to go together. Worth checking those too.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
      ],
      relatedSlugs: ['strap-on', 'rough-sex', 'anal', 'top', 'free'],
    },
    es: {
      intro: [
        'Bondage es una categoría por tipo de contenido aquí, demanda de búsqueda genuinamente dedicada, profundidad real en esta lista. Es sobre estilo de contenido, no apariencia.',
        'Esta lista junta a creadoras que están siendo elegidas para contenido de Bondage ahora mismo, según interacción real.',
      ],
      about: [
        '"Bondage OnlyFans" es una categoría por tipo de contenido armada alrededor de contenido estilo BDSM, restricción, dinámicas de poder, ese tipo de cosas, más que un look específico. Se cruza naturalmente con [[Strap-On|strap-on]] y [[Sexo Duro|rough-sex]] porque estos estilos de contenido suelen ir juntos.',
        'Misma aclaración que toda categoría de contenido aquí, findbyface clasifica y enlaza a perfiles según interacción, no alojamos ni verificamos el contenido en sí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Bondage ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una categoría de contenido, no de apariencia',
          paragraphs: [
            'Sin filtro por apariencia aquí, es puramente sobre estilo de contenido, así que espera variedad real en looks. El hilo compartido es solo el enfoque en contenido BDSM/bondage.',
            'Se cruza con un puñado de categorías relacionadas dependiendo de la mezcla completa de contenido de cada creadora.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Compara caras, no tipo de contenido, así que no va a filtrar por categoría por sí sola.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Esta categoría está filtrada por apariencia?',
          answer: 'No, puramente basada en tipo de contenido, armada alrededor de contenido estilo BDSM. Vas a ver un rango real de looks.',
        },
        {
          question: '¿findbyface aloja este contenido?',
          answer: 'No, clasificamos y enlazamos a perfiles según interacción, el contenido vive en OnlyFans.',
        },
        {
          question: '¿Esto se cruza con Strap-On o Sexo Duro?',
          answer: 'Sí, bastante seguido, estos estilos de contenido suelen ir juntos. Vale la pena revisar esas también.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
      ],
      relatedSlugs: ['strap-on', 'rough-sex', 'anal', 'top', 'free'],
    },
  },

  'strap-on': {
    en: {
      intro: [
        'Strap On is a content-type category here, specific and genuinely searched, real depth to this list. It\'s about content style, not appearance.',
        'This list pulls creators actually getting picked for Strap On content right now, based on real engagement.',
      ],
      about: [
        '"Strap On OnlyFans" is a content-type category built around that specific content style, rather than one particular look. It overlaps naturally with [[Bondage|bondage]] and [[Rough Sex|rough-sex]] since these content types often show up on the same profiles.',
        "Same disclosure as every content-type category here, findbyface ranks and links to profiles based on engagement, we don't host or verify the content itself.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the Strap On category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A content category, not an appearance one',
          paragraphs: [
            'No appearance filtering, purely about content style, so expect real variety in looks across the list. The shared thread is just the content focus.',
            "It crosses over with a handful of related categories depending on each creator's full content mix.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "It matches faces, not content type, so it won't filter by category on its own.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is this category filtered by appearance?',
          answer: "No, purely content-type based. You'll see a real range of looks.",
        },
        {
          question: 'Does findbyface host this content?',
          answer: 'No, we rank and link to profiles based on engagement, the content lives on OnlyFans.',
        },
        {
          question: 'Does this overlap with Bondage or Rough Sex?',
          answer: 'Yeah, pretty often, these content types tend to show up together. Worth checking those too.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
      ],
      relatedSlugs: ['bondage', 'rough-sex', 'anal', 'top', 'free'],
    },
    es: {
      intro: [
        'Strap-On es una categoría por tipo de contenido aquí, específica y genuinamente buscada, profundidad real en esta lista. Es sobre estilo de contenido, no apariencia.',
        'Esta lista junta a creadoras que están siendo elegidas para contenido Strap-On ahora mismo, según interacción real.',
      ],
      about: [
        '"Strap-On OnlyFans" es una categoría por tipo de contenido armada alrededor de ese estilo específico, más que un look particular. Se cruza naturalmente con [[Bondage|bondage]] y [[Sexo Duro|rough-sex]] porque estos tipos de contenido suelen aparecer en los mismos perfiles.',
        'Misma aclaración que toda categoría de contenido aquí, findbyface clasifica y enlaza a perfiles según interacción, no alojamos ni verificamos el contenido en sí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Strap-On ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una categoría de contenido, no de apariencia',
          paragraphs: [
            'Sin filtro por apariencia, puramente sobre estilo de contenido, así que espera variedad real en looks en la lista. El hilo compartido es solo el enfoque de contenido.',
            'Se cruza con un puñado de categorías relacionadas dependiendo de la mezcla completa de contenido de cada creadora.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Compara caras, no tipo de contenido, así que no va a filtrar por categoría por sí sola.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Esta categoría está filtrada por apariencia?',
          answer: 'No, puramente basada en tipo de contenido. Vas a ver un rango real de looks.',
        },
        {
          question: '¿findbyface aloja este contenido?',
          answer: 'No, clasificamos y enlazamos a perfiles según interacción, el contenido vive en OnlyFans.',
        },
        {
          question: '¿Esto se cruza con Bondage o Sexo Duro?',
          answer: 'Sí, bastante seguido, estos tipos de contenido suelen aparecer juntos. Vale la pena revisar esas también.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
      ],
      relatedSlugs: ['bondage', 'rough-sex', 'anal', 'top', 'free'],
    },
  },

  'rough-sex': {
    en: {
      intro: [
        'Rough Sex is a content-type category here, genuinely popular search, real depth to this list. It\'s about content style and intensity, not appearance.',
        'This list pulls creators actually getting picked for Rough Sex content right now, based on real engagement.',
      ],
      about: [
        '"Rough Sex OnlyFans" is a content-type category built around that harder, more intense content style, rather than one specific look. It overlaps naturally with [[Bondage|bondage]], [[Anal|anal]], and [[Strap On|strap-on]] since these content types often go together.',
        "Same disclosure as every content-type category here, findbyface ranks and links to profiles based on engagement, we don't host or verify the content itself.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the Rough Sex category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A content category, not an appearance one',
          paragraphs: [
            'No filtering by look, purely about content style and intensity, so expect real variety in appearance across the list. The shared thread is just the content focus.',
            "It crosses over with several related categories depending on each creator's full content mix.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "It matches faces, not content type, so it won't filter by category on its own.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is this category filtered by appearance?',
          answer: "No, purely content-type based. You'll see a real range of looks.",
        },
        {
          question: 'Does findbyface host this content?',
          answer: 'No, we rank and link to profiles based on engagement, the content lives on OnlyFans.',
        },
        {
          question: 'Does this overlap with Bondage, Anal, or Strap On?',
          answer: 'Yeah, pretty often, these content types tend to show up together. Worth checking those too.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
      ],
      relatedSlugs: ['bondage', 'anal', 'strap-on', 'top', 'free'],
    },
    es: {
      intro: [
        'Sexo Duro es una categoría por tipo de contenido aquí, búsqueda genuinamente popular, profundidad real en esta lista. Es sobre estilo e intensidad de contenido, no apariencia.',
        'Esta lista junta a creadoras que están siendo elegidas para contenido de Sexo Duro ahora mismo, según interacción real.',
      ],
      about: [
        '"Sexo Duro OnlyFans" es una categoría por tipo de contenido armada alrededor de ese estilo más intenso y fuerte, más que un look específico. Se cruza naturalmente con [[Bondage|bondage]], [[Anal|anal]] y [[Strap-On|strap-on]] porque estos tipos de contenido suelen ir juntos.',
        'Misma aclaración que toda categoría de contenido aquí, findbyface clasifica y enlaza a perfiles según interacción, no alojamos ni verificamos el contenido en sí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Sexo Duro ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una categoría de contenido, no de apariencia',
          paragraphs: [
            'Sin filtro por look, puramente sobre estilo e intensidad de contenido, así que espera variedad real en apariencia en la lista. El hilo compartido es solo el enfoque de contenido.',
            'Se cruza con varias categorías relacionadas dependiendo de la mezcla completa de contenido de cada creadora.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Compara caras, no tipo de contenido, así que no va a filtrar por categoría por sí sola.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Esta categoría está filtrada por apariencia?',
          answer: 'No, puramente basada en tipo de contenido. Vas a ver un rango real de looks.',
        },
        {
          question: '¿findbyface aloja este contenido?',
          answer: 'No, clasificamos y enlazamos a perfiles según interacción, el contenido vive en OnlyFans.',
        },
        {
          question: '¿Esto se cruza con Bondage, Anal o Strap-On?',
          answer: 'Sí, bastante seguido, estos tipos de contenido suelen aparecer juntos. Vale la pena revisar esas también.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
      ],
      relatedSlugs: ['bondage', 'anal', 'strap-on', 'top', 'free'],
    },
  },

  bukkake: {
    en: {
      intro: [
        'Bukkake is a specific content-type category here, genuinely searched, though the list runs leaner than some of the broader categories. Every creator here actually fits it.',
        'This list pulls creators actually getting picked for Bukkake content right now, based on real engagement.',
      ],
      about: [
        '"Bukkake OnlyFans" is a content-type category built around that specific content style, rather than one particular look. It overlaps naturally with [[Blowjob|blowjob]] since the two content types often show up on the same profiles, and sometimes with [[Threesome|threesome]] content too.',
        "Same disclosure as every content-type category here, findbyface ranks and links to profiles based on engagement, we don't host or verify the content itself.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the Bukkake category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Why this list runs a bit leaner',
          paragraphs: [
            'This is a more specific content category than some of the broader ones, so the pool of creators genuinely posting this content is naturally smaller. Everyone here actually fits it though, not padded out with loose matches.',
            'Worth checking back regularly since new creators do get added over time.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "It matches faces, not content type, so it won't filter by category on its own.",
          ],
        },
      ],
      faq: [
        {
          question: 'Why is this list smaller than some other categories?',
          answer: "It's a more specific content category, so the pool of creators genuinely posting this content is naturally smaller. Everyone listed actually fits it.",
        },
        {
          question: 'Does findbyface host this content?',
          answer: 'No, we rank and link to profiles based on engagement, the content lives on OnlyFans.',
        },
        {
          question: 'Does this overlap with Blowjob content?',
          answer: 'Yeah, often, the two content types tend to show up on the same profiles.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: "Daily, though because the pool's smaller, changes might feel less dramatic week to week.",
        },
      ],
      relatedSlugs: ['blowjob', 'threesome', 'top', 'free'],
    },
    es: {
      intro: [
        'Bukkake es una categoría por tipo de contenido específica aquí, genuinamente buscada, aunque la lista sea más delgada que algunas categorías más amplias. Cada creadora aquí realmente encaja.',
        'Esta lista junta a creadoras que están siendo elegidas para contenido Bukkake ahora mismo, según interacción real.',
      ],
      about: [
        '"Bukkake OnlyFans" es una categoría por tipo de contenido armada alrededor de ese estilo específico, más que un look particular. Se cruza naturalmente con [[Mamadas|blowjob]] porque los dos tipos de contenido suelen aparecer en los mismos perfiles, y a veces con contenido de [[Tríos|threesome]] también.',
        'Misma aclaración que toda categoría de contenido aquí, findbyface clasifica y enlaza a perfiles según interacción, no alojamos ni verificamos el contenido en sí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Bukkake ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Por qué esta lista es un poco más delgada',
          paragraphs: [
            'Esta es una categoría de contenido más específica que algunas de las más amplias, así que el grupo de creadoras que genuinamente publican este contenido es naturalmente más chico. Eso sí, todas aquí realmente encajan, no rellenas con parecidos.',
            'Vale la pena revisar seguido porque sí se agregan creadoras nuevas con el tiempo.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Compara caras, no tipo de contenido, así que no va a filtrar por categoría por sí sola.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Por qué esta lista es más chica que otras categorías?',
          answer: 'Es una categoría de contenido más específica, así que el grupo de creadoras que genuinamente publican este contenido es naturalmente más chico. Todas las que aparecen realmente encajan.',
        },
        {
          question: '¿findbyface aloja este contenido?',
          answer: 'No, clasificamos y enlazamos a perfiles según interacción, el contenido vive en OnlyFans.',
        },
        {
          question: '¿Esto se cruza con contenido de Mamadas?',
          answer: 'Sí, seguido, los dos tipos de contenido suelen aparecer en los mismos perfiles.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, aunque como el grupo es más chico, los cambios pueden sentirse menos dramáticos semana a semana.',
        },
      ],
      relatedSlugs: ['blowjob', 'threesome', 'top', 'free'],
    },
  },

  'small-tits': {
    en: {
      intro: [
        'Small Tits is a straightforward body-type category here, does what it says, and there\'s a genuinely deep list of creators who fit it. Simple search, real results.',
        'This list pulls creators actually ranking under Small Tits right now, based on real engagement.',
      ],
      about: [
        '"Small Tits OnlyFans" is a body-type category, it overlaps constantly with [[Petite|petite]] since the two builds often go together, though not always, plenty of small-tits creators don\'t fit that specific pairing. There\'s also a separate [[Big Tits|big-tits]] category if that\'s actually more your thing.',
        'Content style varies within the category too, this is purely about that one physical trait, not tied to one specific look otherwise.',
      ],
      topCreatorsIntro: 'These are the creators actually leading the Small Tits category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'Small Tits and Petite often overlap, but not always',
          paragraphs: [
            "These two get grouped together a lot since smaller chest and smaller frame tend to go hand in hand, but it's not a rule, plenty of small-tits creators aren't specifically petite build. Worth browsing both if you're not finding exactly what you want on just one.",
            'Small Tits here is really about that one physical trait specifically, not overall build.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Worth noting it matches faces, not body type, so it won't filter by this category on its own.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is Small Tits the same as Petite?',
          answer: "They overlap a lot since the two builds often go together, but they're separate categories. Plenty of small-tits creators aren't specifically petite, and vice versa.",
        },
        {
          question: 'Does face search filter by body type?',
          answer: "No, it matches faces specifically, not chest size. Useful if you've got a specific face in mind, but won't narrow by this category on its own.",
        },
        {
          question: 'Is there an opposite category?',
          answer: 'Yeah, Big Tits is the separate category on the other end of that spectrum.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
      ],
      relatedSlugs: ['petite', 'big-tits', 'blonde', 'top', 'free'],
    },
    es: {
      intro: [
        'Tetas Pequeñas es una categoría directa por tipo de cuerpo aquí, hace lo que dice, y hay una lista genuinamente profunda de creadoras que encajan. Búsqueda simple, resultados reales.',
        'Esta lista junta a creadoras que están en Tetas Pequeñas ahora mismo, según interacción real.',
      ],
      about: [
        '"Tetas Pequeñas OnlyFans" es una categoría por tipo de cuerpo, se cruza todo el tiempo con [[Petite|petite]] porque las dos contexturas suelen ir juntas, aunque no siempre, bastantes creadoras de tetas pequeñas no encajan en esa combinación específica. También hay una categoría separada de [[Tetas Grandes|big-tits]] si eso es más lo tuyo en realidad.',
        'El estilo de contenido también varía dentro de la categoría, esta es puramente sobre ese rasgo físico específico, no ligada a un look específico fuera de eso.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Tetas Pequeñas ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Tetas Pequeñas y Petite se cruzan seguido, pero no siempre',
          paragraphs: [
            'Estas dos se agrupan bastante porque pecho pequeño y contextura pequeña suelen ir de la mano, pero no es una regla, bastantes creadoras de tetas pequeñas no son específicamente de contextura petite. Vale la pena navegar las dos si no encuentras exactamente lo que buscas en una sola.',
            'Tetas Pequeñas aquí es realmente sobre ese rasgo físico específico, no la contextura general.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Vale la pena aclarar que compara caras, no tipo de cuerpo, así que no va a filtrar por esta categoría por sí sola.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Tetas Pequeñas es lo mismo que Petite?',
          answer: 'Se cruzan bastante porque las dos contexturas suelen ir juntas, pero son categorías separadas. Bastantes creadoras de tetas pequeñas no son específicamente petite, y viceversa.',
        },
        {
          question: '¿La búsqueda facial filtra por tipo de cuerpo?',
          answer: 'No, compara caras específicamente, no tamaño de pecho. Útil si ya tienes una cara específica en mente, pero no va a acotar por esta categoría por sí sola.',
        },
        {
          question: '¿Hay una categoría opuesta?',
          answer: 'Sí, Tetas Grandes es la categoría separada en el otro extremo de ese espectro.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
      ],
      relatedSlugs: ['petite', 'big-tits', 'blonde', 'top', 'free'],
    },
  },

  'big-tits': {
    en: {
      intro: [
        "Big Tits is one of the most consistently searched body-type categories on OnlyFans, genuinely huge fanbase, real depth to this list. If that's specifically your thing, you've got plenty to work with.",
        'This list pulls creators actually ranking under Big Tits right now, based on real engagement.',
      ],
      about: [
        '"Big Tits OnlyFans" is one of the most popular body-type categories on the platform, straightforward and consistently searched. There\'s a separate [[Small Tits|small-tits]] category on the other end of that spectrum if that\'s actually more your thing.',
        'It overlaps constantly with other categories too depending on the creator, [[Blonde|blonde]], [[MILF|milf]], and [[BBW|bbw]] big-tits creators all show up regularly, this is really just about that one physical trait, not tied to one specific look otherwise.',
      ],
      topCreatorsIntro: 'These are the creators actually leading the Big Tits category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'One of the biggest, most searched categories on the site',
          paragraphs: [
            "Not an exaggeration, Big Tits is genuinely one of the most consistently popular searches on OnlyFans overall, so the list here runs deep. Expect real variety in everything else though, ethnicity, hair color, age, this category is purely about that one trait.",
            'Nothing works differently behind the scenes, same engagement-based ranking as every other category.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            "Ranking updates daily based on real engagement, so it's a genuinely live list.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Worth being upfront that face search matches faces, not body type, so it won't filter by chest size on its own, it's a face-matching tool, not a body-type filter.",
          ],
        },
      ],
      faq: [
        {
          question: 'Does face search filter by body type?',
          answer: "No, it matches faces specifically, not chest size or build. Useful if you've got a specific face in mind, but it won't narrow by big tits on its own.",
        },
        {
          question: "What's the difference between Big Tits and Small Tits?",
          answer: 'Just that one physical trait, opposite ends of the spectrum. Both are separate categories here.',
        },
        {
          question: 'Is this category tied to one ethnicity or look?',
          answer: "No, it's purely about that one trait, you'll see blonde, MILF, BBW, and plenty of other overlapping categories represented here.",
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
      ],
      relatedSlugs: ['small-tits', 'blonde', 'milf', 'bbw', 'top', 'free'],
    },
    es: {
      intro: [
        'Tetas Grandes es una de las categorías por tipo de cuerpo más buscadas de forma constante en OnlyFans, base de fans genuinamente enorme, profundidad real en esta lista. Si eso es específicamente lo tuyo, tienes bastante con qué trabajar.',
        'Esta lista junta a creadoras que están en Tetas Grandes ahora mismo, según interacción real.',
      ],
      about: [
        '"Tetas Grandes OnlyFans" es una de las categorías por tipo de cuerpo más populares de la plataforma, directa y buscada de forma constante. Hay una categoría separada de [[Tetas Pequeñas|small-tits]] en el otro extremo de ese espectro si eso es más lo tuyo en realidad.',
        'Se cruza todo el tiempo con otras categorías también dependiendo de la creadora, creadoras tetonas [[Rubias|blonde]], [[MILF|milf]] y [[BBW|bbw]] aparecen seguido, esta es realmente solo sobre ese rasgo físico específico, no ligada a un look específico fuera de eso.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Tetas Grandes ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una de las categorías más grandes y buscadas del sitio',
          paragraphs: [
            'No es exageración, Tetas Grandes es genuinamente una de las búsquedas más populares de forma constante en OnlyFans en general, así que la lista aquí es profunda. Eso sí, espera variedad real en todo lo demás, etnia, color de cabello, edad, esta categoría es puramente sobre ese rasgo.',
            'Nada funciona diferente detrás de cámaras, el mismo ranking basado en interacción que todas las demás categorías.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real, así que es una lista genuinamente viva.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Vale la pena ser honestos, la búsqueda facial compara caras, no tipo de cuerpo, así que no va a filtrar por tamaño de pecho por sí sola, es una herramienta de coincidencia facial, no un filtro de tipo de cuerpo.',
          ],
        },
      ],
      faq: [
        {
          question: '¿La búsqueda facial filtra por tipo de cuerpo?',
          answer: 'No, compara caras específicamente, no tamaño de pecho ni contextura. Útil si ya tienes una cara específica en mente, pero no va a acotar por tetas grandes por sí sola.',
        },
        {
          question: '¿Cuál es la diferencia entre Tetas Grandes y Tetas Pequeñas?',
          answer: 'Solo ese rasgo físico, extremos opuestos del espectro. Ambas son categorías separadas aquí.',
        },
        {
          question: '¿Esta categoría está ligada a una etnia o look?',
          answer: 'No, es puramente sobre ese rasgo, vas a ver rubias, MILF, BBW y muchas otras categorías cruzadas representadas aquí.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
      ],
      relatedSlugs: ['small-tits', 'blonde', 'milf', 'bbw', 'top', 'free'],
    },
  },

  hentai: {
    en: {
      intro: [
        "Hentai is a distinct content category here, anime/cosplay-style content, kept separate from the rest of the site's live-action categories. Real dedicated search demand.",
        'This list pulls creators actually getting picked for Hentai content right now, based on real engagement.',
      ],
      about: [
        '"Hentai OnlyFans" covers anime-style and cosplay content specifically, it\'s its own distinct category rather than overlapping much with the live-action categories elsewhere on the site. Creators here focus on that specific art/content style.',
        "Same disclosure as every content-type category, findbyface ranks and links to profiles based on engagement, we don't host or verify the content itself.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the Hentai category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A distinct content style',
          paragraphs: [
            "This category stands apart from most others on the site since it's specifically anime-style and cosplay content, not live-action in the same way. If that's specifically your thing, this is the dedicated page for it.",
            'Content style still varies within the category, different art styles, different creators, different approaches.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Looking for something else instead?',
          paragraphs: [
            "If you're actually after live-action content that just resembles a specific look, our face search might be more useful, upload a photo and it'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "That said, it's built for real faces, not anime-style content, so it won't help narrow down within Hentai specifically.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is Hentai different from the rest of the site?',
          answer: "Yeah, it's specifically anime-style and cosplay content, distinct from the live-action categories elsewhere on the site.",
        },
        {
          question: 'Does findbyface host this content?',
          answer: 'No, we rank and link to profiles based on engagement, the content lives on OnlyFans.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
        {
          question: 'Does face search work for this category?',
          answer: "It's built for real faces, so it won't help narrow down within Hentai specifically, that tool's more useful for the live-action categories.",
        },
      ],
      relatedSlugs: ['top', 'free'],
    },
    es: {
      intro: [
        'Hentai es una categoría de contenido distinta aquí, contenido estilo anime/cosplay, se mantiene separada del resto de las categorías de acción real del sitio. Demanda de búsqueda genuinamente dedicada.',
        'Esta lista junta a creadoras que están siendo elegidas para contenido Hentai ahora mismo, según interacción real.',
      ],
      about: [
        '"Hentai OnlyFans" cubre contenido estilo anime y cosplay específicamente, es su propia categoría distinta en vez de cruzarse mucho con las categorías de acción real del resto del sitio. Las creadoras aquí se enfocan en ese estilo de arte/contenido específico.',
        'Misma aclaración que toda categoría de contenido, findbyface clasifica y enlaza a perfiles según interacción, no alojamos ni verificamos el contenido en sí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Hentai ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Un estilo de contenido distinto',
          paragraphs: [
            'Esta categoría se separa de la mayoría de las demás del sitio porque es específicamente contenido estilo anime y cosplay, no acción real de la misma forma. Si eso es específicamente lo tuyo, esta es la página dedicada.',
            'El estilo de contenido también varía dentro de la categoría, distintos estilos de arte, distintas creadoras, distintos enfoques.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Buscas algo distinto en realidad?',
          paragraphs: [
            'Si en realidad buscas contenido de acción real que se parezca a un look específico, nuestra búsqueda facial puede ser más útil, sube una foto y va a mostrar creadoras que realmente se parecen a ese look, normalmente en menos de 2 segundos.',
            'Eso sí, está armada para caras reales, no contenido estilo anime, así que no va a ayudar a acotar dentro de Hentai específicamente.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Hentai es diferente del resto del sitio?',
          answer: 'Sí, es específicamente contenido estilo anime y cosplay, distinto de las categorías de acción real del resto del sitio.',
        },
        {
          question: '¿findbyface aloja este contenido?',
          answer: 'No, clasificamos y enlazamos a perfiles según interacción, el contenido vive en OnlyFans.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
        {
          question: '¿La búsqueda facial funciona para esta categoría?',
          answer: 'Está armada para caras reales, así que no va a ayudar a acotar dentro de Hentai específicamente, esa herramienta es más útil para las categorías de acción real.',
        },
      ],
      relatedSlugs: ['top', 'free'],
    },
  },

  'old-young': {
    en: {
      intro: [
        'Old Young is a content-type/dynamic category here, built around age-gap content and roleplay, not appearance specifically. Real dedicated search demand.',
        'This list pulls creators actually getting picked for Old Young content right now, based on real engagement.',
      ],
      about: [
        '"Old Young OnlyFans" covers age-gap content and roleplay dynamics, it overlaps naturally with [[Mature|mature]] and [[MILF|milf]] since older creators often lean into this angle, but it\'s a distinct category focused on that specific dynamic rather than age alone.',
        "Same disclosure as every content-type category, findbyface ranks and links to profiles based on engagement, we don't host or verify the content itself.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the Old Young category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A dynamic/content category, not just an age range',
          paragraphs: [
            "This is really about the age-gap dynamic and roleplay angle specifically, not just any older or younger creator. It overlaps with Mature and MILF a lot since a lot of the same creators lean into this content, but it's its own distinct focus.",
            'Expect real variety in overall look and style, the shared thread is the content angle.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "It matches faces, not content type, so it won't filter by category on its own.",
          ],
        },
      ],
      faq: [
        {
          question: 'Is this just about age, or is it a specific content style?',
          answer: "It's specifically about the age-gap dynamic and roleplay angle, not just any older or younger creator on their own.",
        },
        {
          question: 'Does this overlap with Mature or MILF?',
          answer: 'Yeah, a lot, since older creators often lean into this content angle. Worth checking those too.',
        },
        {
          question: 'Does findbyface host this content?',
          answer: 'No, we rank and link to profiles based on engagement, the content lives on OnlyFans.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
      ],
      relatedSlugs: ['mature', 'milf', 'top', 'free'],
    },
    es: {
      intro: [
        'Viejos y Jóvenes es una categoría por tipo de contenido/dinámica aquí, armada alrededor de contenido y roleplay de diferencia de edad, no apariencia específicamente. Demanda de búsqueda genuinamente dedicada.',
        'Esta lista junta a creadoras que están siendo elegidas para contenido de Viejos y Jóvenes ahora mismo, según interacción real.',
      ],
      about: [
        '"Viejos y Jóvenes OnlyFans" cubre contenido y dinámicas de roleplay de diferencia de edad, se cruza naturalmente con [[Maduras|mature]] y [[MILF|milf]] porque las creadoras mayores suelen meterse en este ángulo, pero es una categoría distinta enfocada en esa dinámica específica más que solo la edad.',
        'Misma aclaración que toda categoría de contenido, findbyface clasifica y enlaza a perfiles según interacción, no alojamos ni verificamos el contenido en sí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Viejos y Jóvenes ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una categoría de dinámica/contenido, no solo un rango de edad',
          paragraphs: [
            'Esta es realmente sobre la dinámica de diferencia de edad y el ángulo de roleplay específicamente, no cualquier creadora mayor o menor. Se cruza mucho con Maduras y MILF porque muchas de las mismas creadoras se meten en este contenido, pero tiene su propio enfoque distinto.',
            'Espera variedad real en look y estilo general, el hilo compartido es el ángulo de contenido.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Compara caras, no tipo de contenido, así que no va a filtrar por categoría por sí sola.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Esto es solo sobre edad o es un estilo de contenido específico?',
          answer: 'Es específicamente sobre la dinámica de diferencia de edad y el ángulo de roleplay, no cualquier creadora mayor o menor por su cuenta.',
        },
        {
          question: '¿Esto se cruza con Maduras o MILF?',
          answer: 'Sí, bastante, porque las creadoras mayores suelen meterse en este ángulo de contenido. Vale la pena revisar esas también.',
        },
        {
          question: '¿findbyface aloja este contenido?',
          answer: 'No, clasificamos y enlazamos a perfiles según interacción, el contenido vive en OnlyFans.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
      ],
      relatedSlugs: ['mature', 'milf', 'top', 'free'],
    },
  },

  threesome: {
    en: {
      intro: [
        'Threesome is a content-type category here, group content specifically, genuinely popular search. Real depth to this list.',
        'This list pulls creators actually getting picked for Threesome content right now, based on real engagement.',
      ],
      about: [
        '"Threesome OnlyFans" covers group content, FFM, MMF, and similar dynamics, it\'s a content-type category rather than tied to one specific look. It overlaps naturally with [[Bukkake|bukkake]] and [[Rough Sex|rough-sex]] since these often show up together on the same profiles.',
        "Same disclosure as every content-type category, findbyface ranks and links to profiles based on engagement, we don't host or verify the content itself.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the Threesome category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A content category, not an appearance one',
          paragraphs: [
            'No filtering by look, this is purely about the group-content format. Expect real variety in appearance across the list, the shared thread is the content style.',
            "It crosses over with several related categories depending on each creator's full content mix.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "It matches faces, not content type, so it won't filter by category on its own.",
          ],
        },
      ],
      faq: [
        {
          question: 'What kind of content is in this category?',
          answer: "Group content, FFM, MMF, and similar dynamics. It's about the format, not one specific look.",
        },
        {
          question: 'Does findbyface host this content?',
          answer: 'No, we rank and link to profiles based on engagement, the content lives on OnlyFans.',
        },
        {
          question: 'Does this overlap with Bukkake or Rough Sex?',
          answer: 'Yeah, pretty often, these content types tend to show up together.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
      ],
      relatedSlugs: ['bukkake', 'rough-sex', 'top', 'free'],
    },
    es: {
      intro: [
        'Tríos es una categoría por tipo de contenido aquí, contenido grupal específicamente, búsqueda genuinamente popular. Profundidad real en esta lista.',
        'Esta lista junta a creadoras que están siendo elegidas para contenido de Tríos ahora mismo, según interacción real.',
      ],
      about: [
        '"Tríos OnlyFans" cubre contenido grupal, FFM, MMF y dinámicas similares, es una categoría por tipo de contenido más que ligada a un look específico. Se cruza naturalmente con [[Bukkake|bukkake]] y [[Sexo Duro|rough-sex]] porque estos suelen aparecer juntos en los mismos perfiles.',
        'Misma aclaración que toda categoría de contenido, findbyface clasifica y enlaza a perfiles según interacción, no alojamos ni verificamos el contenido en sí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Tríos ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: 'Una categoría de contenido, no de apariencia',
          paragraphs: [
            'Sin filtro por look, esto es puramente sobre el formato de contenido grupal. Espera variedad real en apariencia en la lista, el hilo compartido es el estilo de contenido.',
            'Se cruza con varias categorías relacionadas dependiendo de la mezcla completa de contenido de cada creadora.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Compara caras, no tipo de contenido, así que no va a filtrar por categoría por sí sola.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Qué tipo de contenido hay en esta categoría?',
          answer: 'Contenido grupal, FFM, MMF y dinámicas similares. Es sobre el formato, no un look específico.',
        },
        {
          question: '¿findbyface aloja este contenido?',
          answer: 'No, clasificamos y enlazamos a perfiles según interacción, el contenido vive en OnlyFans.',
        },
        {
          question: '¿Esto se cruza con Bukkake o Sexo Duro?',
          answer: 'Sí, bastante seguido, estos tipos de contenido suelen aparecer juntos.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
      ],
      relatedSlugs: ['bukkake', 'rough-sex', 'top', 'free'],
    },
  },

  celebrity: {
    en: {
      intro: [
        'Celebrity is a distinct category here, creators leaning into that famous/recognizable persona angle, closely tied to Models and Top. Real dedicated search demand.',
        'This list pulls creators actually getting picked for Celebrity right now, based on real engagement.',
      ],
      about: [
        '"Celebrity OnlyFans" covers creators presenting that famous, recognizable persona, think polished branding and a public-figure kind of presence, rather than one specific look. It overlaps heavily with [[Models|models]] and [[Top|top]] since a lot of the same creators show up across all three.',
        "Worth being upfront that this is about presentation and persona, findbyface isn't claiming these are literal celebrities, it's a content/branding category like the others here.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the Celebrity category right now, ranked by real engagement.',
      sections: [
        {
          heading: "What actually makes someone 'Celebrity' here",
          paragraphs: [
            "It's about presentation and persona, honestly, that polished, public-figure kind of presence, not a claim about actual fame or identity. Two creators with totally different looks can both land here if the persona fits.",
            'Heavy overlap with Models and Top too, since presentation-focused creators tend to show up across all three lists.',
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            "Ranking updates daily based on real engagement, so it's a genuinely live list.",
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but faster if you know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: "Does 'Celebrity' mean these are actual famous people?",
          answer: 'No, it\'s about presentation and persona, that polished public-figure kind of presence, not a claim about real-world fame or identity.',
        },
        {
          question: 'Does this overlap with Models or Top?',
          answer: 'Yeah, a lot, presentation-focused creators tend to show up across all three lists.',
        },
        {
          question: 'How is the ranking decided?',
          answer: 'Real engagement, favorites and subscriber activity pulled live from OnlyFans, same system as every category.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: 'Yeah, upload a photo to our face search, usually under 2 seconds.',
        },
      ],
      relatedSlugs: ['models', 'top', 'blonde', 'free'],
    },
    es: {
      intro: [
        'Famosas es una categoría distinta aquí, creadoras que se meten en ese ángulo de personaje famoso y reconocible, muy ligada a Modelos y Top. Demanda de búsqueda genuinamente dedicada.',
        'Esta lista junta a creadoras que están siendo elegidas para Famosas ahora mismo, según interacción real.',
      ],
      about: [
        '"Famosas OnlyFans" cubre creadoras que presentan ese personaje famoso y reconocible, piensa en marca pulida y una presencia tipo figura pública, más que un look específico. Se cruza mucho con [[Modelos|models]] y [[Top|top]] porque muchas de las mismas creadoras aparecen en las tres.',
        'Vale la pena ser honestos, esto es sobre presentación y personaje, findbyface no está diciendo que estas sean celebridades literales, es una categoría de contenido/marca como las demás aquí.',
      ],
      topCreatorsIntro: 'Estas son las creadoras que realmente van a la cabeza de la categoría Famosas ahora mismo, ordenadas por interacción real.',
      sections: [
        {
          heading: "Qué es lo que realmente hace que alguien sea 'Famosas' aquí",
          paragraphs: [
            'Es sobre presentación y personaje, honestamente, esa presencia pulida tipo figura pública, no una afirmación sobre fama real o identidad. Dos creadoras con looks totalmente distintos pueden aparecer aquí si el personaje encaja.',
            'Mucho cruce con Modelos y Top también, porque las creadoras enfocadas en presentación suelen aparecer en las tres listas.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real, así que es una lista genuinamente viva.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadoras que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero más rápido si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: "¿'Famosas' significa que son celebridades reales?",
          answer: 'No, es sobre presentación y personaje, esa presencia pulida tipo figura pública, no una afirmación sobre fama real o identidad.',
        },
        {
          question: '¿Esto se cruza con Modelos o Top?',
          answer: 'Sí, bastante, las creadoras enfocadas en presentación suelen aparecer en las tres listas.',
        },
        {
          question: '¿Cómo se decide el ranking?',
          answer: 'Interacción real, favoritos y actividad de suscriptores sacada en vivo de OnlyFans, el mismo sistema que todas las categorías.',
        },
        {
          question: '¿Estas creadoras están verificadas?',
          answer: 'Algunas sí, otras no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['models', 'top', 'blonde', 'free'],
    },
  },

  'solo-male': {
    en: {
      intro: [
        "Solo Male is its own distinct category here, male creators specifically, separate from the rest of the site's mostly female-creator categories. Real dedicated search demand.",
        'This list pulls creators actually getting picked for Solo Male right now, based on real engagement.',
      ],
      about: [
        '"Solo Male OnlyFans" covers male creators, kept as its own distinct category since the rest of the site\'s categories are mostly organized around female creators. Content style and presentation vary a lot within this category too.',
        "Same ranking system as everywhere else on the site, this category isn't treated any differently behind the scenes.",
      ],
      topCreatorsIntro: 'These are the creators actually leading the Solo Male category right now, ranked by real engagement.',
      sections: [
        {
          heading: 'A distinct category, same ranking system',
          paragraphs: [
            "This one's set apart mainly because most of the site's other categories are organized around female creators, Solo Male covers male creators specifically. Nothing about the ranking mechanics changes though.",
            "Expect real variety in content style and presentation within the category, it's not one narrow type.",
          ],
        },
        {
          heading: "What you'll actually find on this list",
          paragraphs: [
            'Standard mix, free and paid together, verified badges on some, bundle deals now and then. Price and verification sit right on the card.',
            'Ranking updates daily based on real engagement.',
          ],
        },
        {
          heading: 'Already know the exact look you want?',
          paragraphs: [
            "If you've already got a specific face in mind... honestly just upload a photo to our face search instead of scrolling. It'll pull up creators who actually resemble that look, usually in under 2 seconds.",
            "Visual match, not a guarantee, but faster if you know exactly who you're picturing.",
          ],
        },
      ],
      faq: [
        {
          question: 'Why is Solo Male its own category?',
          answer: "Most of the site's other categories are organized around female creators, so Solo Male covers male creators specifically as its own distinct list.",
        },
        {
          question: 'Is the ranking different for this category?',
          answer: 'No, same system, real engagement pulled live from OnlyFans, no special treatment.',
        },
        {
          question: 'Is this one specific content style?',
          answer: 'No, there\'s real variety within the category, different content styles and presentation.',
        },
        {
          question: 'Are these creators verified?',
          answer: "Some are, some aren't, we show the badge either way.",
        },
        {
          question: 'Is this list free or paid?',
          answer: 'Both, mixed. Use the Free filter for $0-subscribe accounts.',
        },
        {
          question: 'How often does this list update?',
          answer: 'Daily, refreshed every 24 hours.',
        },
        {
          question: 'Can I search for a specific look instead of browsing?',
          answer: 'Yeah, upload a photo to our face search, usually under 2 seconds.',
        },
      ],
      relatedSlugs: ['top', 'free'],
    },
    es: {
      intro: [
        'Solo Hombres es su propia categoría distinta aquí, creadores hombres específicamente, separada del resto de las categorías del sitio que en su mayoría giran en torno a creadoras mujeres. Demanda de búsqueda genuinamente dedicada.',
        'Esta lista junta a creadores que están siendo elegidos para Solo Hombres ahora mismo, según interacción real.',
      ],
      about: [
        '"Solo Hombres OnlyFans" cubre creadores hombres, se mantiene como su propia categoría distinta porque el resto de las categorías del sitio están organizadas en su mayoría en torno a creadoras mujeres. El estilo de contenido y presentación también varía bastante dentro de esta categoría.',
        'Mismo sistema de ranking que en todo el sitio, esta categoría no recibe ningún trato diferente detrás de cámaras.',
      ],
      topCreatorsIntro: 'Estos son los creadores que realmente van a la cabeza de la categoría Solo Hombres ahora mismo, ordenados por interacción real.',
      sections: [
        {
          heading: 'Una categoría distinta, mismo sistema de ranking',
          paragraphs: [
            'Esta se separa principalmente porque la mayoría de las otras categorías del sitio están organizadas en torno a creadoras mujeres, Solo Hombres cubre creadores hombres específicamente. Nada de la mecánica del ranking cambia eso sí.',
            'Espera variedad real en estilo de contenido y presentación dentro de la categoría, no es un solo tipo angosto.',
          ],
        },
        {
          heading: 'Qué te vas a encontrar en esta lista',
          paragraphs: [
            'Mezcla estándar, gratis y de pago juntas, algunas con insignia de verificadas, packs de vez en cuando. El precio y la verificación están justo en la tarjeta.',
            'El ranking se actualiza a diario según interacción real.',
          ],
        },
        {
          heading: '¿Ya sabes exactamente qué cara buscas?',
          paragraphs: [
            'Si ya tienes una cara específica en mente... honestamente mejor sube una foto a nuestra búsqueda facial en vez de scrollear. Te va a mostrar creadores que realmente se parecen a esa cara, normalmente en menos de 2 segundos.',
            'Coincidencia visual, no garantía, pero más rápido si ya sabes exactamente a quién te imaginas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Por qué Solo Hombres es su propia categoría?',
          answer: 'La mayoría de las otras categorías del sitio están organizadas en torno a creadoras mujeres, así que Solo Hombres cubre creadores hombres específicamente como su propia lista distinta.',
        },
        {
          question: '¿El ranking es diferente para esta categoría?',
          answer: 'No, mismo sistema, interacción real sacada en vivo de OnlyFans, sin trato especial.',
        },
        {
          question: '¿Es un solo estilo de contenido específico?',
          answer: 'No, hay variedad real dentro de la categoría, distintos estilos de contenido y presentación.',
        },
        {
          question: '¿Estos creadores están verificados?',
          answer: 'Algunos sí, otros no, mostramos la insignia en ambos casos.',
        },
        {
          question: '¿Esta lista es gratis o de pago?',
          answer: 'Ambos, mezclado. Usa el filtro Gratis para cuentas de suscripción $0.',
        },
        {
          question: '¿Cada cuánto se actualiza esta lista?',
          answer: 'A diario, actualizada cada 24 horas.',
        },
        {
          question: '¿Puedo buscar una cara específica en vez de navegar?',
          answer: 'Sí, sube una foto a nuestra búsqueda facial, normalmente en menos de 2 segundos.',
        },
      ],
      relatedSlugs: ['top', 'free'],
    },
  },
};

export function getCategoryContent(slug: string, locale: 'en' | 'es'): CategoryContentEntry | undefined {
  return categoryContent[slug]?.[locale];
}
