# ADR

Trento's ADR repository contains the Architecture Decision Records (ADR) for the project.
Please refer to the ADR GitHub page and  this article for more info about Architecture Decision Records.

## How to contribute

### Install ASDF and the ADR plugin

Follow the instructions in the [ASDF documentation](https://asdf-vm.com/#/core-manage-asdf-vm) to install ASDF.

Then, install the [adr-tools plugin](https://github.com/npryce/adr-tools)

### Create a new ADR

Run the following command to create a new ADR:

```bash
adr new "Wanda is the best rabbit pet"
```

### Supersede an ADR

Run the following command to supersede an ADR:

```bash
# supersede the ADR 0009
adr new -s 9 new "Tonio is the best rabbit pet"
```

## Resources

- [Architecture Decision Records](https://adr.github.io/)
- [Spotify Blog post about ADR](https://engineering.atspotify.com/2020/04/when-should-i-write-an-architecture-decision-record/)
  