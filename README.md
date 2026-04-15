# README

## Forward

This foxglove plugin is a replacement for the current foxglove gridmap display.
I had to do some "interesting" maneuvers to allow one to discover topics in addition to bypassing a default foxglove topic.

This brings to light a few different things.

1. The first being that the extension API should allow users to set a default topic handler for general messages. (For example,  if I don't like the current implementation of a foxglove default message display or I have additional features that I would like to add, then I should be able to offer a user through my extension, the option to override the default topic that is currently present)
2. Give custom topics the ability to declare options, without needing an entire react interface / extension panel.
3. Fix current foxglove's gridmap transform issue.
4. Add intensity bounds for display

I think with these adjustments to the foxglove API and foxglove user interface, that the over all software would better be able to support the needs of its users.

## Setup

To set up this code-base run

```bash
npm install
```

In the project directory

Then to build the project run

```bash
npm run package
```

Afterwards you will get a `.foxe` file which you can drag in to foxglove

## Usage

So once you build it, and install it to foxglove, you will need to add a gridmap foxglove panel to your foxglove interface. Once you do that, follow the instructions on the pannel.

## Notes

- This system uses toggle "Yes/No"  as buttons. When you press "Yes",  it will activate the event handler. The "No" option exists just to enable the button functionality.
- This has primarily been tested on the app version of foxglove and not on the web version. That being said, some of the work-arounds may not work as intended, so use at your own wrisk.
