---
title: "ENGEL: understanding the scene before landing"
slug: engel-perception-for-landing
date: 2026-11-03
summary: "How scene understanding, prior maps, and live semantic mapping connect to landing assistance for rescue helicopters."
tags: [Project notes, Scene understanding, Assisted flight]
draft: false
image: /images/writing/engel-teaser.svg
imageAlt: "Concept illustration of a helicopter approaching a landing area, connecting terrain knowledge, live perception, and obstacle context."
relatedProject: /work.html#engel
---
A rescue helicopter may need to approach terrain that was never designed as a landing site. The useful question is not only where the ground is, but what is on it, what surrounds it, and how that picture changes during the approach.

**ENGEL** investigates assistance for these situations, combining sensing, scene understanding, flight guidance, and pilot-facing information. The broader project aims to support safer, energy-efficient rescue-helicopter operations in demanding environments.

My work sits on the perception and mapping side: making environmental information useful to the components that assess the scene and support the next decision.

## Two views of the same environment

A prepared map and an onboard sensor stream answer different questions.

**Prior map information** can describe terrain and land cover over a wider area. It gives the system context before the aircraft reaches a particular location.

**Live perception and mapping** describe what the sensors observe during operation. Semantic scene parsing and a local 3D representation help connect those observations to the surrounding environment.

The engineering question is how to use these sources together without confusing what was known beforehand with what has just been observed.

## From map layers to landing context

The project work includes landing-site assessment from surface-height and land-cover information. In parallel, the live mapping work uses a Radix-based semantic representation to describe the local scene.

Connecting those pieces requires clear interfaces: which information a consumer needs, which coordinate frame it uses, how recent it is, and what remains unknown. A useful map is not necessarily the largest map; it is one that supplies the information needed for the task with a clear meaning.

My focus also includes making these perception and mapping components practical on onboard hardware, and developing repeatable ways to test their integration and resource use.

## What I’ll explore here

- How prior terrain information and live observations complement one another.
- How semantic mapping can provide context for landing-site assessment.
- How deployment and hardware-based testing fit into the perception workflow.

These are notes on ongoing research and engineering. The teaser illustrates the idea; it is not a certified landing assessment or a flight-test result.

## Project context

Read the [ENGEL overview from TUM](https://www.asg.ed.tum.de/en/ht/research/ongoing-research-projects/engel-energy-efficient-flight-guidance/) and the [consortium perspective from XITASO](https://xitaso.com/en/projects/engel/). My [collaborative-project overview](/work.html#engel) provides more context on my contribution.
