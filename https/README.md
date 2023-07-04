# HTTPS on localhost

- https://api.promise.local
- https://api.local.promise.co

## Usage

1. Install dependencies: [docker](https://github.com/docker), [mkcert](https://github.com/FiloSottile/mkcert)

    ```sh
    $ brew install --cask docker
    $ brew install mkcert
    ```

2. Run docker application.
3. Run commands below: (It will ask you for a password.)
  
    ```sh
    $ make install
    $ make run
    ```

4. Open https://api.local.promise.co in your browser.
5. Run commands below to uninstall: (It will ask you for a password.)

    ```sh
    $ make clean
    $ make uninstall
    ```
