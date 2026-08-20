import type { Html, HtmlBuilder } from 'foldkit/html'

const reviewPanelKeyedByData = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.keyed('div')(
    `${model.isCardSelected}:${model.isTermsAccepted}`,
    [],
    [reviewContentView(model, h)],
  )

const reviewPanel = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div([], [reviewContentView(model, h)])
