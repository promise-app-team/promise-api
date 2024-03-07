# HTTPS on localhost

- https://api.local.promise-app.com

## Usage

1. Install dependencies: [docker](https://github.com/docker), [mkcert](https://github.com/FiloSottile/mkcert)

    ```sh
    $ brew install --cask docker
    $ brew install mkcert
    ```

2. Run commands below: (It will ask you for a password.)

    ```sh
    $ make install
    ```

3. Open https://api.local.promise-app.com in your browser.

4. Run commands below to uninstall: (It will ask you for a password.)

    ```sh
    $ make uninstall
    ```
