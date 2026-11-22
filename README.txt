Teëbe Combat — v19 (clean rebuild of dnd_combat_v18)

Files
  index.html      page layout
  styles.css      look and feel
  app.js          screens, buttons, saving, undo, backup
  rules.js        Gloom Stalker damage rules (which dice to roll, totals)
  character.js    default dice/bonuses from the Level 5 sheet
  sw.js           offline support
  icons/          your approved line icons + app icons

How it works
  Toggle Hunter's Mark / Favoured Foe / Sharpshooter / Dread Ambush.
  For each attack: Hit, Crit or Miss, then tap the numbers on your real dice.
  The app asks only for the dice that apply (crit doubles dice, Favoured Foe once per turn,
  Dread Ambush adds an extra attack with +1d8 on the first turn).
  Changing a toggle mid-roll keeps the numbers already entered.

Run on PC:  py -3 -m http.server 8791 --directory "C:\Users\User\Desktop\DnD\teebe_app"
            then open http://127.0.0.1:8791
Phone install needs it hosted over HTTPS (e.g. GitHub Pages), then Chrome menu > Add to Home screen.
