// Categories and missable flags are read from the official description.
// A flag is a warning with a reason, not a claim that the game was tested here.

const STORY_MISSION = /^Complete (Gone Fishing|Breakfast Run|The Cartel Heist|Child's Play|Headliners|VCIA Takedown|Operation Savage Glory)\.$/;

export function categoryFromDescription(description) {
  if (description.startsWith('Congratulations!')) return 'capstone';
  if (description === 'Attain 100% Completion.') return 'capstone';
  if (/^Complete Chapter \d+\.$/.test(description)) return 'story';
  if (description === 'Complete the final mission.') return 'story';
  if (STORY_MISSION.test(description)) return 'story';
  if (/^Complete the final mission for /.test(description)) return 'story';
  if (/^Hunt a unique animal for /.test(description)) return 'story';
  if (description.includes('strangers across the state')) return 'story';
  if (/Meditate at every spot|Collectible Card|WAiNK It at|Discover \d+ vehicles|Explore all of|garage properties|Register \d+ vehicles/.test(description)) {
    return 'collectibles';
  }
  return 'activities';
}

export function categoryLabel(category) {
  if (category === 'story') return 'Story';
  if (category === 'collectibles') return 'Collectibles';
  if (category === 'activities') return 'Activities';
  return 'Platinum path';
}

function clearReason(description) {
  const category = categoryFromDescription(description);
  if (category === 'story') {
    return 'Not missable. The description is a required mission, chapter, or stranger finale, so the trophy pops when that beat is finished. You do not choose your way out of it.';
  }
  if (category === 'capstone') {
    return 'Not missable. It waits on the rest of the list or on the 100% checklist. No single chapter choice locks it.';
  }
  if (category === 'collectibles') {
    return 'Not missable. The description is a collection you can keep working after the story. Nothing in the official line says the set closes.';
  }
  return 'Not missable. The description is a free-roam counter, crime, or stunt, with no chapter deadline in the official line.';
}

/** Why a trophy is flagged, derived from what its official description commits you to. */
export function missableFromDescription(description) {
  if (description.startsWith('Meditate at every spot')) {
    return {
      flagged: true,
      tone: 'risk',
      reason: 'Flagged because the description says every meditation spot, so a spot that closes would make the trophy impossible. Launch guides say the Chapter 1 balcony session after Down to Earth may end with the chapter (PowerPyx, 18 Nov 2026). A 21 Nov 2026 note says the trophy can pop without it. Do that session before Chapter 1 ends anyway.',
    };
  }
  if (description.includes('strangers across the state')) {
    return {
      flagged: true,
      tone: 'watch',
      reason: 'Flagged because the description demands 8 strands, so one strand that expires can leave you short. A launch checklist names Race Against Yago, in Chapter 3, as time-limited (game-checklists.com, 21 Nov 2026). Start any stranger job that looks timed, and keep a manual save before a chapter ends. This is a count at risk, not a single dialogue branch.',
    };
  }
  if (description === "Second time's the charm.") {
    return {
      flagged: true,
      tone: 'watch',
      reason: 'Flagged because the description is a second attempt, and story missions cannot be replayed. If the first chance was a one-off, only the return is left. The Click (20 Nov 2026) has not confirmed the trigger. Their lead is a second robbery of the prologue payday-loan shop after Chapter 3, and they also record a player who tried that and got nothing. Look for the second chance. Do not treat the method as solved.',
    };
  }
  if (description === 'Choices made (for better or worse).') {
    return {
      flagged: true,
      tone: 'watch',
      reason: 'Flagged because the description is about choices, and choices inside a story mission cannot be taken back. Launch notes say only the finale can be replayed (TheTechBasket, 20 Nov 2026). The PlayStation counter on this list runs to 500, which is a long tally rather than one ending branch, and free-roam actions can keep adding to it. Take the choices as they appear. This is a watch, not a confirmed point of no return.',
    };
  }
  return { flagged: false, tone: 'clear', reason: clearReason(description) };
}

export function hidesAsSpoiler(trophy, earnedNames) {
  return trophy.category === 'story' && !earnedNames.has(trophy.name);
}

export function prepareAll(doc) {
  const trophies = doc.trophies.map((trophy) => ({
    ...trophy,
    category: categoryFromDescription(trophy.description),
    missable: missableFromDescription(trophy.description),
  }));
  const byId = new Map(trophies.map((trophy) => [trophy.id, trophy]));
  const seen = new Set();
  for (const stage of doc.roadmap ?? []) {
    for (const id of stage.steps) {
      if (seen.has(id)) throw new Error(`roadmap lists trophy ${id} twice`);
      seen.add(id);
      const trophy = byId.get(id);
      if (!trophy) throw new Error(`roadmap names unknown trophy ${id}`);
      trophy.stageId = stage.id;
      trophy.stageTitle = stage.title;
      trophy.stageKicker = stage.kicker;
    }
  }
  if (seen.size !== trophies.length) {
    const missing = trophies.filter((trophy) => !seen.has(trophy.id)).map((trophy) => trophy.id);
    throw new Error(`roadmap is missing trophies ${missing.join(', ')}`);
  }
  return { game: doc.game, platform: doc.platform, roadmap: doc.roadmap, trophies };
}
