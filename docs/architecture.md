# Architettura di Sistema

## Diagramma Componenti
```
┌──────────────┐       ┌──────────────┐
│  Telegram    │       │  WhatsApp    │
│  Adapter     │◄─────►│  Adapter     │
└──────┬───────┘       └──────┬───────┘
       │                      │
       ▼                      ▼
┌───────────────────────────────────────┐
│              Router Core              │
│  • Message Context Normalization      │
│  • Group Chat Management              │
│  • Session Tracking                   │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│            Plugin System              │
│  • AutoForward Plugin                 │
│  • MediaLogger Plugin                 │
│  • Custom Business Logic              │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│          Storage Layer                │
│  • Redis: Caching & Session State     │
│  • PostgreSQL: Persistent Sessions    │
│  • MongoDB: Message Logging           │
└───────────────────────────────────────┘
```

## Flusso Messaggi
1. Un messaggio arriva su Telegram/WhatsApp
2. L'adapter normalizza il contesto (testo, media, metadata)
3. Il router gestisce il routing basato su:
   - Tipo di chat (privata/gruppo)
   - Regole di inoltro configurate
   - Stato sessione utente
4. I plugin elaborano il messaggio in sequenza
5. Il message forwarder gestisce gli inoltri cross-platform
6. Lo storage persiste lo stato e il logging

## Vantaggi Architetturali
- **Isolamento Piattaforme**: Cambiamenti in un adapter non influenzano gli altri
- **Estensibilità Plugin**: Nuove funzionalità senza modificare il core
- **Resilienza**: Redis per failover veloce, database per persistenza
- **Scalabilità**: Componenti distribuibili su istanze separate
