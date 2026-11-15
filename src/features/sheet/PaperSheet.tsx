import { ATTRIBUTE_IDS } from '../../game-rules/attributes'
import { STAT_IDS } from '../../game-rules/stats'
import { PaperQrCode, PokemonSprite } from '../../ui'
import { type SheetView, characterLink, typeName } from './shown'

export interface PaperSheetProps extends SheetView {
  /** The app's address, for the link its QR code holds. */
  origin: string
  /** Shows it on screen as a page, for the design board. Without it, the sheet exists only in print. */
  preview?: boolean
}

/**
 * A character's sheet on paper (decision 98): who it is and its six roleplay
 * attributes, its combat stats and its moves, its items and Pokédollars, and
 * its QR code. Black on white, with words where the screen has colours and
 * icons. It shows the character as it stands when printed; beside its HP and
 * each move's PP, which change during play, an empty box is left to pencil
 * the new number in (decision 106).
 */
export function PaperSheet({ pack, character, numbers, language, messages, origin, preview = false }: PaperSheetProps) {
  const text = messages.sheet
  const paper = text.paper
  const battle = messages.battle
  const species = pack.species[character.species]
  if (!species) return null
  const nature = character.nature ? pack.natures[character.nature] : undefined
  const ability = pack.abilities[character.ability]
  const held = character.heldItem ? pack.items[character.heldItem] : undefined
  const condition = character.condition

  return (
    <article className={`dn-paper${preview ? ' dn-paper--preview' : ''}`}>
      <header className="dn-paper__head">
        <span className="dn-paper__sprite">
          <PokemonSprite species={species} name={species.name[language]} female={character.gender === 'F'} scale={0.5} frozen decorative />
        </span>
        <div>
          <h1 className="dn-paper__name">{character.nickname}</h1>
          <p className="dn-paper__sub">
            {species.name[language]}
            {species.types.map((type) => (
              <span key={type} className="dn-paper__tag">
                {typeName(pack, type, language)}
              </span>
            ))}
          </p>
          <p className="dn-paper__sub">{character.campaign.name}</p>
        </div>
        <p className="dn-paper__level">
          {battle.level} {character.level}
          <br />
          {messages.creation.identity.genders[character.gender]}
        </p>
      </header>

      <section className="dn-paper__section dn-paper__cols">
        <div>
          <h2 className="dn-paper__title">{paper.identity}</h2>
          <dl className="dn-paper__facts">
            <dt>{text.nature}</dt>
            <dd>{nature ? nature.name[language] : text.neutral}</dd>
            <dt>{text.ability}</dt>
            <dd>
              {ability?.name[language]}
              {ability && <p className="dn-paper__small">{ability.description[language]}</p>}
            </dd>
            <dt>{text.held}</dt>
            <dd>{held ? held.name[language] : text.nothing}</dd>
            <dt>{text.exp}</dt>
            <dd>
              {character.exp}
              <p className="dn-paper__small">{numbers.exp.next === undefined ? text.topLevel : text.nextLevel(numbers.exp.next)}</p>
            </dd>
          </dl>
        </div>
        <div>
          <h2 className="dn-paper__title">{text.attributes}</h2>
          <ul className="dn-paper__scores">
            {ATTRIBUTE_IDS.map((attribute) => (
              <li key={attribute} className="dn-paper__score">
                <span className="dn-paper__score-value">{numbers.attributes[attribute]}</span>
                <span className="dn-paper__score-name">{messages.creation.attributes.names[attribute]}</span>
              </li>
            ))}
          </ul>
          {numbers.unplaced.attributes > 0 && <p className="dn-paper__small">{text.unplaced(numbers.unplaced.attributes)}</p>}
        </div>
      </section>

      <section className="dn-paper__section dn-paper__cols">
        <div>
          <h2 className="dn-paper__title">{paper.combat}</h2>
          <p>
            {battle.hp} {character.hp}/{numbers.stats.hp}
            <PencilBox wide />
            {character.status && ` · ${battle.status[character.status].name}`}
            {condition.state === 'downed' && ` · ${text.downed(condition.stacks)}`}
            {condition.state === 'dead' && ` · ${text.dead}`}
          </p>
          <table className="dn-paper__table">
            <thead>
              <tr>
                <th scope="col">{text.stat}</th>
                <th scope="col" className="dn-paper__figure">
                  {text.ivs}
                </th>
                <th scope="col" className="dn-paper__figure">
                  {text.evs}
                </th>
                <th scope="col" className="dn-paper__figure">
                  {text.value}
                </th>
              </tr>
            </thead>
            <tbody>
              {STAT_IDS.map((stat) => (
                <tr key={stat}>
                  <th scope="row">
                    {pack.statNames[stat][language]}
                    {nature?.plus === stat && ' ▲'}
                    {nature?.minus === stat && ' ▼'}
                  </th>
                  <td className="dn-paper__figure">{character.ivs[stat]}</td>
                  <td className="dn-paper__figure">{character.evs[stat]}</td>
                  <td className="dn-paper__figure">{numbers.stats[stat]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {numbers.unplaced.ivs > 0 && <p className="dn-paper__small">{text.ivsLeft(numbers.unplaced.ivs)}</p>}
          {numbers.unplaced.evs > 0 && <p className="dn-paper__small">{text.evsLeft(numbers.unplaced.evs)}</p>}
        </div>
        <div className="dn-paper__code">
          <PaperQrCode text={characterLink(character, origin)} label={character.nickname} tooLong={text.tooLarge} />
          <p className="dn-paper__small">{paper.scan}</p>
        </div>
      </section>

      <section className="dn-paper__section">
        <h2 className="dn-paper__title">{paper.moves}</h2>
        <table className="dn-paper__table">
          <thead>
            <tr>
              <th scope="col">{paper.move}</th>
              <th scope="col">{paper.type}</th>
              <th scope="col">{paper.category}</th>
              <th scope="col" className="dn-paper__figure">
                {paper.pp}
              </th>
              <th scope="col" className="dn-paper__figure">
                {text.power}
              </th>
              <th scope="col" className="dn-paper__figure">
                {text.accuracy}
              </th>
            </tr>
          </thead>
          {character.moves.map((slot) => {
            const move = pack.moves[slot.id]
            if (!move) return null
            return (
              <tbody key={slot.id} className="dn-paper__entry">
                <tr>
                  <th scope="row">{move.name[language]}</th>
                  <td>
                    <span className="dn-paper__tag">{typeName(pack, move.type, language)}</span>
                  </td>
                  <td>{battle.category[move.category]}</td>
                  <td className="dn-paper__figure">
                    {slot.pp}/{numbers.maxPp[slot.id] ?? slot.pp}
                    <PencilBox />
                  </td>
                  <td className="dn-paper__figure">{move.power > 0 ? move.power : text.noFigure}</td>
                  <td className="dn-paper__figure">{move.accuracy === true ? text.noFigure : move.accuracy}</td>
                </tr>
                <tr>
                  <td colSpan={6} className="dn-paper__small">
                    {move.description[language]}
                  </td>
                </tr>
              </tbody>
            )
          })}
        </table>
      </section>

      <section className="dn-paper__section">
        <h2 className="dn-paper__title">{paper.items}</h2>
        <dl className="dn-paper__facts">
          <dt>{text.held}</dt>
          <dd>{held ? held.name[language] : text.nothing}</dd>
          <dt>{text.moneyLabel}</dt>
          <dd>{text.money(character.money)}</dd>
        </dl>
        {character.bag.length === 0 && <p className="dn-paper__small">{text.emptyBag}</p>}
        <ul className="dn-paper__bag">
          {character.bag.map((stack) => {
            const item = pack.items[stack.item]
            return item ? (
              <li key={stack.item}>
                <span>{item.name[language]}</span>
                <span>×{stack.quantity}</span>
              </li>
            ) : null
          })}
        </ul>
      </section>

      <footer className="dn-paper__foot">
        {messages.app.name} · {messages.app.notice}
      </footer>
    </article>
  )
}

/** An empty box to write a number in by hand. It says nothing by itself: the figure beside it does. */
function PencilBox({ wide = false }: { wide?: boolean }) {
  return <span className={`dn-paper__box${wide ? ' dn-paper__box--wide' : ''}`} aria-hidden="true" />
}
