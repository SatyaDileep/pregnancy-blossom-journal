/* Art prompts for milestone pages.
   Each milestone has a `scene` (what to draw) and an `importance` (why this
   milestone matters). app.js fills in the dynamic parts — the page's own note,
   the week, baby's size & development, and the mentions — so every prompt is
   grounded in the family's actual journal. No AI here, just warm templates. */
window.ART_PROMPTS = {
  style:
    'A tender hand-painted watercolor storybook illustration for a pregnancy journal, soft pastel palette, cozy and dreamy, gentle light, small decorative details like pressed flowers and ribbon',
  closing:
    'Warm and nostalgic, portrait orientation 3:4, no text, no letters, no words in the image',
  generic: {
    scene:
      'a gentle illustrated scene of a tender family moment on a special day, warm and intimate, like a page from a beloved storybook',
    importance:
      'a chapter in this family\u2019s journey \u2014 a moment the parents chose to remember forever'
  },
  /* Milestone pages keep their identity by template id when untouched, but an
     edited page gets a fresh uuid — so also match by the stable title. */
  byTitle: {
    'The little line': 'home-test',
    'Your first blood test': 'beta-hcg',
    'We saw the sac': 'sac',
    'We heard your heartbeat': 'heartbeat',
    'Our booking appointment': 'booking',
    'Our dating scan': 'dating',
    'We felt you move': 'movements',
    'The 20-week scan': 'anatomy',
    'The sugar-check appointment': 'glucose',
    'A growth check': 'growth',
    'You turned head-down': 'turned',
    'Full term': 'fullterm',
    'Your birth day': 'birth'
  },
  byKey: {
    'home-test': {
      scene:
        'two faint pink lines on a small white pregnancy test lying on soft linen by a moonlit window, a few tiny daisies and a steaming cup of tea nearby, an unseen secret glowing warm in the dark',
      importance:
        'the very first proof \u2014 two little lines that started everything, a secret joy the parents hold between themselves before telling anyone'
    },
    'beta-hcg': {
      scene:
        'a delicate glass vial of rose-pink blood resting on a clinic counter beside a handwritten note and a small green sprout in a pot, morning sunlight through a window',
      importance:
        'the first scientific confirmation \u2014 blood numbers doubling like a heartbeat, proof that the tiny seed is truly alive and growing'
    },
    sac: {
      scene:
        'an ultrasound screen glowing softly in a dim room, showing a tiny round pearl-like sac inside a dark pool, a mother\u2019s and father\u2019s hands gently clasped in the foreground',
      importance:
        'the first sight \u2014 seeing the tiny cozy home where the little one is nesting, and hearing the words \u201cit is exactly where it should be\u201d'
    },
    heartbeat: {
      scene:
        'a mother\u2019s hand resting on her belly in a quiet blue room, a small glowing heart shape floating above her like a firefly, an ultrasound machine humming softly in the corner',
      importance:
        'the first rhythm of life \u2014 a tiny heartbeat twice as fast as their own, the moment everything becomes wonderfully real'
    },
    booking: {
      scene:
        'a cozy midwife\u2019s clinic desk with a clipboard, a stethoscope, a warm cup of tea, dried flowers in a little vase, and a soft knitted baby blanket folded on a chair',
      importance:
        'the first official welcome into care \u2014 the formalities and the what-if list that made the pregnancy feel wonderfully, officially expected'
    },
    dating: {
      scene:
        'a blurry ultrasound image of a tiny curled figure waving small arms and legs, like a little astronaut floating inside a round glowing window, sparkles around it',
      importance:
        'the first real glimpse of a tiny person \u2014 arms and legs waving, and the gift of a real due date to count down to'
    },
    movements: {
      scene:
        'a butterfly resting on a mother\u2019s belly at golden hour, tiny sparkles of motion drawn like dancing dust in the air, wildflowers all around',
      importance:
        'the first flutter of life felt from the inside \u2014 a tiny kick that becomes the family\u2019s favorite way to say goodnight'
    },
    anatomy: {
      scene:
        'a perfect tiny heart drawn in delicate watercolor above a scanned image, ten little toes and ten little fingers scattered like flower petals, soft rainbows',
      importance:
        'ten fingers, ten toes and a perfect little heart \u2014 the most wonderful report the parents have ever received'
    },
    glucose: {
      scene:
        'a glass of sweet lemon drink on a clinic table beside a friendly little hourglass and a small cup of raspberries, warm reassuring light',
      importance:
        'a sweet drink, an hour of waiting, and two little vials \u2014 a gentle check that cares for both mother and baby'
    },
    growth: {
      scene:
        'a soft measuring tape curled like a ribbon beside a growing sunflower sprout in a terracotta pot, a wooden ruler with gentle pencil marks, morning dew',
      importance:
        'measuring how well the little one is thriving \u2014 on track and growing beautifully, already making the parents so proud'
    },
    turned: {
      scene:
        'a little baby curled head-down inside a round cozy cave like a nesting bird, slowly turning, a starry night sky visible through a window in the cave wall',
      importance:
        'the little one settling into place \u2014 a quiet knock from the inside that says they are getting ready for the big entrance'
    },
    fullterm: {
      scene:
        'a packed little hospital bag with a knitted blanket and tiny booties, a cluster of soft balloons, a door slightly open with warm golden light spilling through',
      importance:
        'officially ready to arrive any moment \u2014 the parents have been waiting for this little one for a very long time'
    },
    birth: {
      scene:
        'a sunrise over a calm sea, a single tiny footprint in the sand, a bundle of soft golden light carried by gentle hands, doves circling in the warm sky',
      importance:
        'the day the story of waiting meets its very first ending \u2014 the moment everything becomes real, soft and perfect'
    }
  }
};
