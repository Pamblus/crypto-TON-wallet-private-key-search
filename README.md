# crypto-TON-wallet-private-key-search
Код для поиска кошельков с балансом блокчейна TON по приватному ключу

## Запуск

ts-node find.ts

## Описание
Скрипт получает кошелек по сгенерированному приватному hex ключу. 
Чтобы посмотреть баланс кошелька используется TonCenter API.
Можно использовать несколько ключей API чтобы ускорить работу.
Ключ можно получить бесплатно в Телеграм боте:
 https://t.me/tonapibot сайт: toncenter.com
Terms of Use: https://toncenter.com/toncenter_gtc.pdf

## Настройки
Настройки скрипта: config.json

- randomBytes: true/false - независимо что указано в seed.txt будет генерировать рандомный hex ключ.
- sameSymbols: true/false 
- wordToBytes: true/false - добавьте в массив "word" слова чтобы конвертировать их в hex.
- parallelProcesses: 5 - введите число чтобы указать кол-во потоков, одновременных запросов баланса кошелька.
- apiKeys:[] - массив toncenter api ключей, чем больше тем лучше.
- threadsPerKey: 4 - кол-во запросов на 1 ключ.
- saveHashes: true/false
- display - показывать в консоли.
- saveData: true/false - сохранять по выбору данных.
- saveDataAddress - сохранять в файл адреса в которых найдены слова из массива words не зависимо от регистра и местоположения.
- showGenerationCount: true/false - показывать кол-во сканированных адресов после запуска.
