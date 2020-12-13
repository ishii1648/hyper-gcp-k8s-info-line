const { shell } = require('electron');
const { exec } = require('child_process');
const color = require('color');
const path = require('path');

const configuration = {
    gcpConfigurePath: "~/.config/gcloud/configurations/config_default",
    kubectxBinary: 'kubectx',
    devGCPProjects: []
};

const state = {
    gcpProject: 'n/a',
    kubernetesContext: 'n/a',
    isChangeEnv: false
}

const productionColorScheme = {
    foregroundColor: '#ECF0F1', // athensGray
    borderColor: '#1C2140', // midnightExpress
    cursorColor: '#FF506C',
    colors: {
        black: '#000000',
        white: '#ffffff',
        red: '#FF506C',
        green: '#FF506C',
        yellow: '#FF506C',
        blue: '#FF506C',
        magenta: '#FF506C',
        cyan: '#FF506C',
        lightBlack: '#FF506C',
        lightRed: '#FF506C',
        lightGreen: '#FF506C',
        lightYellow: '#FF506C',
        lightBlue: '#FF506C',
        lightMagenta: '#FF506C',
        lightCyan: '#FF506C',
        colorCubes: '#ffffff', // white
        grayscale: '#ECF0F1' // athensGray
    }
}

function setGcpProject() {
    exec("cat " + configuration.gcpConfigurePath + " | grep project", (error, stdout, stderr) => {
        if (error) {
            state.gcpProject = 'n/a';
            return
        }

        oldGcpProject = state.gcpProject
        project = stdout.split("=")[1].trim()
        state.gcpProject = project

        if (oldGcpProject != state.gcpProject) {
            state.isChangeEnv = true
        }
    })
}

function setKubernetesContext() {
    exec("kubectx -c", (error, stdout, stderr) => {
        if (error) {
            state.kubernetesContext = 'n/a';
            return
        }
        state.kubernetesContext = stdout;
    })
}

function setConfiguration() {
    setGcpProject();
    setKubernetesContext();
}

exports.reduceUI = (state_, { type, config }) => {
    switch (type) {
        case 'CONFIG_LOAD':
            if (config.hasOwnProperty('hyperGcpKubernetesInfoLine')) {
                Object.assign(configuration, config.hyperGcpKubernetesInfoLine)
            }
            let initialColorScheme = {}
            Object.keys(productionColorScheme).forEach((key) => {
                initialColorScheme[key] = state_[key]
            })
            return state_.set('initialColorScheme', initialColorScheme)
        case 'CONFIG_RELOAD': {
            if (config.hasOwnProperty('hyperGcpKubernetesInfoLine')) {
                Object.assign(configuration, config.hyperGcpKubernetesInfoLine)
            }
            if (!config.hasOwnProperty('prdColorScheme')) {
                return state_
            }
            if (state.gcpProject.indexOf(configuration.devGCPProjects) > -1) {
                return state_.set('prdColorScheme', {empty: true})
            }

            return state_.set('prdColorScheme', config.prdColorScheme)
        }
    }

    return state_
}

exports.decorateConfig = (config) => {
    const colors = {
        foreground: config.foregroundColor || '#fff',
        background: color(config.backgroundColor || '#000').lighten(0.3).string()
    };

    let pluginBasedir = (process.platform === 'win32') ? path.join(__dirname).replace(/\\/g, '/') : __dirname

    return Object.assign({}, config, {
        css: `
            ${config.css || ''}
            .terms_terms {
                margin-bottom: 30px;
            }
            .hyper-gcp-status-line {
                display: flex;
                justify-content: flex-start;
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 100;
                font-size: 12px;
                height: 30px;
                padding: 5px 0 0 10px;
                color: ${colors.foreground};
                background-color: ${colors.background};
            }
            .hyper-gcp-status-line .item {
                padding: 2px 10px 0 25px;
                cursor: default;
                overflow: hidden;
                min-width: 0;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .hyper-gcp-status-line .gcp-project {
                background: url(${pluginBasedir}/icons/gcp.svg) no-repeat;
            }
            .hyper-gcp-status-line .kubernetes-context {
                background: url(${pluginBasedir}/icons/kubernetes.svg) no-repeat;
            }
            .hyper-gcp-status-line .gcp-status {
                background: url(${pluginBasedir}/icons/status.svg) no-repeat;
                cursor: pointer;
            }
        `
    })
}

exports.decorateHyper = (Hyper, { React, notify }) => {
    return class extends React.PureComponent {
        constructor(props) {
            super(props);
            this.state = {};
            this.handleClick = this.handleClick.bind(this);
        }

        handleClick(event) {
            shell.openExternal(configuration.gcpStatusUrl);
        }

        render() {
            const { customChildren } = this.props;
            const existingChildren = customChildren ? customChildren instanceof Array ? customChildren : [customChildren] : [];

            return (
                React.createElement(Hyper, Object.assign({}, this.props, {
                    customInnerChildren: existingChildren.concat(React.createElement('footer', { className: 'hyper-gcp-status-line' },
                        React.createElement('div', { className: 'item gcp-project', title: 'GCP project' }, this.state.gcpProject),
                        React.createElement('div', { className: 'item kubernetes-context', title: 'Kubernetes context and namespace' }, this.state.kubernetesContext),
                    ))
                }))
            );
        }

        componentDidMount() {
            // Check configuration, and kick off timer to watch for updates
            setConfiguration();
            this.repaintInterval = setInterval(() => {
                this.setState(state);
            }, 100);
        }

        componentWillUnmount() {
            clearInterval(this.repaintInterval);
            clearInterval(this.pollGcpStatusInterval);
        }
    };
}

exports.middleware = (store) => (next) => (action) => {
    switch (action.type) {
        case 'SESSION_ADD_DATA':
            if (action.data.indexOf('\n') > 1) {
                setConfiguration();

                if (state.isChangeEnv) {
                    store.dispatch({
                        type: 'CONFIG_RELOAD',
                        config: { prdColorScheme: productionColorScheme }
                    });
                    state.isChangeEnv = false
                }
            }
            break;

        case 'SESSION_SET_ACTIVE':
            setConfiguration();
            break;
    }

    next(action);
}

exports.mapTermsState = (state, map) => {
    if (!state.ui.prdColorScheme) {
        return map;
    }
    if (Object.keys(state.ui.prdColorScheme).indexOf('empty') > -1) {
        return Object.assign({}, map, {profiles: state.ui.initialColorScheme});
    }
    return Object.assign({}, map, {profiles: state.ui.prdColorScheme});
}

exports.getTermGroupProps = (uid, parentProps, props) => {
    const {profiles} = parentProps
    if (!profiles) {
        return props
    }
    const profileProps = Object.assign({}, profiles);

    return Object.assign({}, props, profileProps);
};
