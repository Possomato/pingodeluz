insert into size_tables (id, name, columns, rows)
values (
  'padrao-meninas',
  'Padrão meninas',
  '["tórax","cintura","comprimento"]',
  '[
    {"size":"1m",  "values":{"tórax":40,"cintura":39,"comprimento":32}},
    {"size":"3m",  "values":{"tórax":44,"cintura":41,"comprimento":35}},
    {"size":"6m",  "values":{"tórax":46,"cintura":43,"comprimento":38}},
    {"size":"9m",  "values":{"tórax":48,"cintura":44,"comprimento":41}},
    {"size":"1",   "values":{"tórax":50,"cintura":48,"comprimento":44}},
    {"size":"2",   "values":{"tórax":53,"cintura":52,"comprimento":50}},
    {"size":"4",   "values":{"tórax":57,"cintura":56,"comprimento":60}},
    {"size":"6",   "values":{"tórax":61,"cintura":58,"comprimento":65}},
    {"size":"8",   "values":{"tórax":66,"cintura":60,"comprimento":70}},
    {"size":"10",  "values":{"tórax":70,"cintura":62,"comprimento":75}},
    {"size":"12",  "values":{"tórax":75,"cintura":64,"comprimento":80}},
    {"size":"14",  "values":{"tórax":78,"cintura":66,"comprimento":85}}
  ]'
)
on conflict (id) do nothing;
