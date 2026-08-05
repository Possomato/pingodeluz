# ADR-3 — Estoque baixa na aprovação do pagamento

**Situação:** aceito · 2026-08-04

## Contexto

Existiam dois momentos possíveis para dar baixa: ao criar o pedido (reserva) ou
ao confirmar o pagamento. Reservar na criação protege contra venda dupla, mas
prende estoque de carrinho abandonado — e, num Checkout Pro com redirect, boa
parte dos pedidos criados nunca é paga.

## Decisão

O estoque é conferido na criação do pedido (para não deixar alguém pagar por
peça esgotada) mas só **baixa** quando a notificação de pagamento aprovado
chega, via `decrement_stock`. Cancelamento e reembolso repõem, via
`restore_stock`. Ambas as funções são SQL com `for update`, então dois
pagamentos simultâneos não vendem a mesma última peça.

Se a baixa falhar depois do pagamento aprovado — o caso raro em que a última
peça foi vendida entre a criação e a aprovação — o pedido **não** é recusado:
o dinheiro já entrou. Ele é marcado com `needs_attention` e aparece destacado
na listagem do painel para resolução manual.

## Consequências

Estoque não fica preso por carrinho abandonado. Em troca, existe uma janela
pequena de sobrevenda, tratada por exceção e com aviso explícito ao lojista, em
vez de silenciosamente.

Alternativa considerada e adiada: reserva com prazo de validade (TTL), que
resolveria a janela ao custo de um processo de expiração.
