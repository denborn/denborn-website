import { HudBox, PokemonSprite, StatusBadge, TypeLabel } from '../../ui'
import { AGONY_STACKS, type SheetView, typeName } from './shown'

/** A character on a top screen: the Pokémon, its box with its HP and condition, and its types. */
export function Portrait({ pack, character, numbers, language, messages }: SheetView) {
  const battle = messages.battle
  const species = pack.species[character.species]
  const condition = character.condition
  if (!species) return null
  return (
    <div className="dn-sheet-top">
      <PokemonSprite species={species} name={species.name[language]} female={character.gender === 'F'} frozen={condition.state !== 'standing'} decorative />
      <div className="dn-sheet-top__box">
        <HudBox
          side="player"
          name={character.nickname}
          level={character.level}
          gender={character.gender}
          hp={character.hp}
          maxHp={numbers.stats.hp}
          text={battle}
          showNumbers
          {...(condition.state === 'downed' ? { agony: { stacks: condition.stacks, text: battle.agony, label: battle.agonyLabel(condition.stacks, AGONY_STACKS) } } : {})}
        >
          {character.status && <StatusBadge status={character.status} text={battle.status[character.status].badge} label={battle.status[character.status].name} />}
        </HudBox>
        <span className="dn-sheet-top__types">
          {species.types.map((type) => (
            <TypeLabel key={type} type={type} text={typeName(pack, type, language)} />
          ))}
        </span>
        {condition.state === 'dead' && <span className="dn-status dn-sheet-top__dead">{messages.sheet.dead}</span>}
      </div>
    </div>
  )
}
