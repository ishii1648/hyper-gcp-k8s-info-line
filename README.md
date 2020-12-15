# hyper-gcp-k8s-info-line

hyper-gcp-k8s-info-line is a permanent fork of https://github.com/marcjoha/hyper-gcp-status-line

![hyper-gcp-k8s-info-line](https://user-images.githubusercontent.com/7684738/102224398-417f4180-3f29-11eb-8e83-0920d6914168.gif)

## Why was hyper-gcp-k8s-info-line created ?

Of course, hyper-gcp-status-line is a greate plugin, but is a bit slow.
hyper-gcp-k8s-info-line is omit some function and change internal processing for speedup.

## Installation

Add the following to your `~/.hyper.js` config:

```javascript
module.exports = {
  ...
  plugins: ["hyper-gcp-kubernetes-info-line"]
  ...
}
```

## Configuration

```javascript
module.exports = {
  config: {
    ...
    hyperGcpKubernetesInfoLine: {
      devGCPProjects: ["gcp-dev-project"],
      kubectlBinary: "/usr/local/bin/kubectl"
    }
    ...
  }
}
```
