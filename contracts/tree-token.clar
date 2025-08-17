;; TreeToken Contract
;; Clarity v2
;; Manages TREE tokens for ArborChain, rewarding reforestation efforts with minting, burning, transferring, staking, and role-based controls

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INSUFFICIENT-BALANCE u101)
(define-constant ERR-INSUFFICIENT-STAKE u102)
(define-constant ERR-MAX-SUPPLY-REACHED u103)
(define-constant ERR-PAUSED u104)
(define-constant ERR-ZERO-ADDRESS u105)
(define-constant ERR-INVALID-AMOUNT u106)
(define-constant ERR-MINTING-LOCKED u107)
(define-constant ERR-INVALID-ROLE u108)
(define-constant ERR-MINTING-SCHEDULE-EXPIRED u109)

;; Token metadata
(define-constant TOKEN-NAME "ArborChain Tree Token")
(define-constant TOKEN-SYMBOL "TREE")
(define-constant TOKEN-DECIMALS u8)
(define-constant MAX-SUPPLY u10000000000000000) ;; 100M tokens with 8 decimals
(define-constant MINTING-DECAY-RATE u5000000) ;; 5% decay per period (basis points)
(define-constant MINTING-PERIOD u1440) ;; ~1 day in Stacks blocks (10 min/block)

;; Contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var total-supply uint u0)
(define-data-var last-mint-block uint u0)
(define-data-var current-mint-cap uint MAX-SUPPLY)
(define-data-var minter principal tx-sender)
(define-data-var governance principal tx-sender)

;; Data maps
(define-map balances principal uint)
(define-map staked-balances principal uint)
(define-map allowances { owner: principal, spender: principal } uint)
(define-map roles principal { can-mint: bool, can-govern: bool })

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin)))

;; Private helper: is-minter
(define-private (is-minter)
  (or (is-admin) (get can-mint (default-to { can-mint: false, can-govern: false } (map-get? roles tx-sender)))))

;; Private helper: is-governance
(define-private (is-governance)
  (or (is-admin) (is-eq tx-sender (var-get governance))))

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED)))

;; Private helper: update mint cap based on decay schedule
(define-private (update-mint-cap)
  (let ((blocks-elapsed (- block-height (var-get last-mint-block)))
        (decay-factor (/ (* MINTING-DECAY-RATE blocks-elapsed) u10000)))
    (if (>= blocks-elapsed MINTING-PERIOD)
        (begin
          (var-set current-mint-cap (/ (* (var-get current-mint-cap) (- u10000 decay-factor)) u10000))
          (var-set last-mint-block block-height))
        false)
    (ok (var-get current-mint-cap))))

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)))

;; Set minter role
(define-public (set-minter (target principal) (can-mint bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq target 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (map-set roles target { can-mint: can-mint, can-govern: (get can-govern (default-to { can-mint: false, can-govern: false } (map-get? roles target))) })
    (ok true)))

;; Set governance role
(define-public (set-governance (new-governance principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-governance 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set governance new-governance)
    (ok true)))

;; Pause/unpause contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)))

;; Mint tokens with decay schedule
(define-public (mint (recipient principal) (amount uint))
  (begin
    (asserts! (is-minter) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (try! (update-mint-cap))
    (let ((new-supply (+ (var-get total-supply) amount)))
      (asserts! (<= new-supply (var-get current-mint-cap)) (err ERR-MINTING-LOCKED))
      (asserts! (<= new-supply MAX-SUPPLY) (err ERR-MAX-SUPPLY-REACHED))
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      (var-set total-supply new-supply)
      (ok true))))

;; Burn tokens
(define-public (burn (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- balance amount))
      (var-set total-supply (- (var-get total-supply) amount))
      (ok true))))

;; Transfer tokens
(define-public (transfer (recipient principal) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((sender-balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= sender-balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- sender-balance amount))
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      (ok true))))

;; Batch transfer tokens
(define-public (batch-transfer (recipients (list 100 { to: principal, amount: uint })))
  (begin
    (ensure-not-paused)
    (fold batch-transfer-iter recipients (ok true))))

(define-private (batch-transfer-iter (entry { to: principal, amount: uint }) (prev (response bool uint)))
  (begin
    (try! prev)
    (asserts! (not (is-eq (get to entry) 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> (get amount entry) u0) (err ERR-INVALID-AMOUNT))
    (let ((sender-balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= sender-balance (get amount entry)) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- sender-balance (get amount entry)))
      (map-set balances (get to entry) (+ (get amount entry) (default-to u0 (map-get? balances (get to entry)))))
      (ok true))))

;; Approve spender allowance
(define-public (approve (spender principal) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (not (is-eq spender 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (map-set allowances { owner: tx-sender, spender: spender } amount)
    (ok true)))

;; Transfer from allowance
(define-public (transfer-from (owner principal) (recipient principal) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((allowance (default-to u0 (map-get? allowances { owner: owner, spender: tx-sender })))
          (owner-balance (default-to u0 (map-get? balances owner))))
      (asserts! (>= allowance amount) (err ERR-NOT-AUTHORIZED))
      (asserts! (>= owner-balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set allowances { owner: owner, spender: tx-sender } (- allowance amount))
      (map-set balances owner (- owner-balance amount))
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      (ok true))))

;; Stake tokens for governance
(define-public (stake (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- balance amount))
      (map-set staked-balances tx-sender (+ amount (default-to u0 (map-get? staked-balances tx-sender))))
      (ok true))))

;; Unstake tokens
(define-public (unstake (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((stake-balance (default-to u0 (map-get? staked-balances tx-sender))))
      (asserts! (>= stake-balance amount) (err ERR-INSUFFICIENT-STAKE))
      (map-set staked-balances tx-sender (- stake-balance amount))
      (map-set balances tx-sender (+ amount (default-to u0 (map-get? balances tx-sender))))
      (ok true))))

;; Read-only: get balance
(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account))))

;; Read-only: get staked balance
(define-read-only (get-staked (account principal))
  (ok (default-to u0 (map-get? staked-balances account))))

;; Read-only: get allowance
(define-read-only (get-allowance (owner principal) (spender principal))
  (ok (default-to u0 (map-get? allowances { owner: owner, spender: spender }))))

;; Read-only: get total supply
(define-read-only (get-total-supply)
  (ok (var-get total-supply)))

;; Read-only: get current mint cap
(define-read-only (get-mint-cap)
  (ok (var-get current-mint-cap)))

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin)))

;; Read-only: get minter
(define-read-only (get-minter)
  (ok (var-get minter)))

;; Read-only: get governance
(define-read-only (get-governance)
  (ok (var-get governance)))

;; Read-only: check if paused
(define-read-only (is-paused)
  (ok (var-get paused)))

;; Read-only: get role
(define-read-only (get-role (account principal))
  (ok (default-to { can-mint: false, can-govern: false } (map-get? roles account))))