define([
    'jquery',
    '/common/inner/sidebar-layout.js',
    '/customize/messages.js',
    '/common/hyperscript.js',
    '/common/common-interface.js',
    '/common/common-util.js',
    '/common/common-ui-elements.js',
    '/common/pad-types.js',
    '/api/instance',

    'css!/components/bootstrap/dist/css/bootstrap.min.css',
    'css!/components/components-font-awesome/css/font-awesome.min.css',

], function(
    $,
    Sidebar,
    Messages,
    h,
    UI,
    Util,
    UIElements,
    PadTypes
) {

    //XXX
    Messages.admin_onboardingNameTitle = 'Welcome to your CryptPad instance';
    Messages.admin_onboardingNameHint = 'Please choose a title and description';
    Messages.admin_onboardingAppsTitle = "Choose your applications";
    Messages.admin_onboardingAppsHint = "Choose which apps to disable on your instance";
    Messages.admin_onboardingRegistrationTitle = "Options";
    Messages.admin_onboardingRegistrationHint = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In id tristique justo";
    Messages.admin_onboardingRegistration = "Visitors to the instance are not able to create accounts. Invitations can be created by administrators";
    Messages.admin_onboardingMfa = "All accounts on the instance have to use 2-factor authentication";
    Messages.admin_onboardingNamePlaceholder = 'Instance title'
    Messages.admin_onboardingDescPlaceholder = 'Placeholder description text'

    var OnboardScreen = {};

    var displayForm = function(sendAdminDecree, page) {

        var pages = [OnboardScreen.appConfig, OnboardScreen.mfaRegistrationScreen, OnboardScreen.titleConfig];
        var nextPageFunction = pages[page];
        var nextPageForm = nextPageFunction(sendAdminDecree);
        var elem = document.createElement('div');
        elem.setAttribute('id', 'cp-loading');
        let frame = h('div.configscreen', nextPageForm);
        elem.append(frame);
        var intr;
        var append = function () {
            if (!document.body) { return; }
            clearInterval(intr);
            document.body.appendChild(elem);
        };
        intr = setInterval(append, 100);
        append();
    
    };

    var flushCache = () => {
            console.log('flushcashe')
            // sendAdminDecree('FLUSH_CACHE', function (e, response) {
            //     if (e || response.error) {
            //         UI.warn(Messages.error);
            //         console.error(e, response);
            //         return;
            //     }

            // })
        };

    OnboardScreen.titleConfig = function (sendAdminDecree, sendAdminRpc) {

        const blocks = Sidebar.blocks('admin');

        var titleDescBlock = function() {

            var input = blocks.input({
                type: 'text',
                value:  '',
                placeholder: Messages.admin_onboardingNamePlaceholder,
                'aria-labelledby': 'cp-admin-name'
            });

            var desc =  blocks.textarea({
                placeholder: Messages.admin_onboardingDescPlaceholder,
                value:  '',
                'aria-labelledby': 'cp-admin-description'
            });

            $(desc).addClass('cp-onboardscreen-desc');

            return [input, desc];
        };

        var logoBlock = function() {

            let inputLogo = blocks.input({
                type: 'file',
                accept: 'image/*',
                'aria-labelledby': 'cp-admin-logo'
            });

            var currentContainer = blocks.block([], 'cp-admin-customize-logo');
            let redraw = () => {
                var current = h('img', {src: '/api/logo?'+(+new Date())});
                $(currentContainer).empty().append(current);
            };
            redraw();

            var upload = blocks.button('primary', '', Messages.admin_logoButton);
            var remove = blocks.button('danger', '', Messages.admin_logoRemoveButton);

            let spinnerBlock = blocks.inline();
            let spinner = UI.makeSpinner($(spinnerBlock));
            let formLogo = blocks.form([
                currentContainer,
                blocks.block(inputLogo),
                blocks.nav([upload, remove, spinnerBlock])
            ]);

            let $button = $(upload);
            let $remove = $(remove);

            Util.onClickEnter($button, function () {
                let files = inputLogo.files;
                if (files.length !== 1) {
                    UI.warn(Messages.error);
                    return;
                }
                spinner.spin();
                $button.attr('disabled', 'disabled');
                let reader = new FileReader();
                reader.onloadend = function () {
                    let dataURL = this.result;
                    sendAdminRpc('UPLOAD_LOGO', {dataURL}, function (e, response) {
                        $button.removeAttr('disabled');
                        if (e || response.error) {
                            UI.warn(Messages.error);
                            $(inputLogo).val('');
                            console.error(e, response);
                            return;
                        }
                        flushCache();
                        redraw();
                        spinner.done();
                        UI.log(Messages.saved);
                    });

                };
                reader.readAsDataURL(files[0]);
            });
            UI.confirmButton($remove, {
                classes: 'btn-danger',
                multiple: true
            }, function () {
                spinner.spin();
                $remove.attr('disabled', 'disabled');
                sendAdminRpc('REMOVE_LOGO', {}, function (e, response) {
                    $remove.removeAttr('disabled');
                    if (e) {
                        UI.warn(Messages.error);
                        console.error(e, response);
                        spinner.hide();
                        return;
                    }
                    redraw();
                    spinner.done();
                    UI.log(Messages.saved);
                });
            });

            return formLogo;
        };

        var colorBlock = function () {

            let selectorColor = '';
            // XXX Number of accent color presets
            var colors = UIElements.makePalette(5, (color, $color) => {
                let rgb = $color.css('background-color');
                let hex = Util.rgbToHex(rgb);
                selectorColor = hex;
                // XXX Save only at the end
                sendAdminRpc('CHANGE_COLOR', {color:selectedColor}, function (e, response) {
                    if (e || response.error) {
                        UI.warn(Messages.error);
                        console.error(e, response);
                        return;
                    }
                    UI.log(Messages.saved);
                });
            });
            var $colors = $(colors).attr('id', 'cp-install-color');
            var content = h('div.cp-onboardscreen-colorpick', [
                h('label', {for:'cp-install-color'}, Messages.kanban_color),
                colors
            ]);

            return content;
        };

        var button = blocks.activeButton('primary', '', Messages.settings_save, function (done) {

            // XXX Save only at the end
            sendAdminDecree('SET_INSTANCE_NAME', [$(titleInput).val().trim()], function (e, response) {
                if (e || response.error) {
                    UI.warn(Messages.error);
                    console.error(e, response);
                    done(false);
                    return;
                }
                flushCache();
                done(true);
                UI.log(Messages.saved);

            })
            sendAdminDecree('SET_INSTANCE_DESCRIPTION', [$(desc).val().trim()], function (e, response) {
                if (e || response.error) {
                    UI.warn(Messages.error);
                    console.error(e, response);
                    done(false);
                    return;
                }
                flushCache();
                done(true);
                UI.log(Messages.saved);

            })

            displayForm(sendAdminDecree, 0);
        });

        var titleInput = h('div.cp-onboardscreen-name', titleDescBlock()[0]);
        var logoInput = h('div.cp-onboardscreen-logo', logoBlock());
        var desc = h('div', titleDescBlock()[1]);
        var colorInput =  h('div.cp-onboardscreen-color', colorBlock());

        var screenTitle = h('div.cp-onboardscreen-screentitle');
        $(screenTitle).append(h('div.cp-onboardscreen-maintitle', h('h1.cp-onboardscreen-title', Messages.install_onboardingNameTitle), h('span', Messages.install_onboardingNameHint)));
        var nav = blocks.nav([button]);

        $(button).addClass('cp-onboardscreen-save');
        $(button).addClass('cp-onboardscreen-title-save');
        $(nav).addClass('cp-onboardscreen-nav')
        $(nav).addClass('cp-onboardscreen-title-nav')

        var textForm= h('div.cp-instance-text-form',[
            titleInput,
            desc,
            colorInput,
        ]);

        var instanceForm = h('div.cp-instance-form', [logoInput, textForm]);

        var form = blocks.form([
            screenTitle,
            instanceForm
        ], nav);

        $(form).addClass('cp-onboardscreen-form');

        return form;

    };

    OnboardScreen.appConfig = function (sendAdminDecree) {

        const blocks = Sidebar.blocks('admin');
        const grid = blocks.block([], 'cp-admin-customize-apps-grid');
        const allApps = PadTypes.appsToSelect;
        const appsToDisable = [];
            
        function select(app, appBlock) {
            if (appsToDisable.indexOf(app) === -1) {
                appsToDisable.push(app);
                var checkMark = h('div.cp-onboardscreen-checkmark');
                $(checkMark).addClass('fa-check');
                appBlock.append(checkMark);
                $(`#${app}-block`).addClass('cp-active-app') 
            } else {
                appsToDisable.splice(appsToDisable.indexOf(app), 1);
                $(`#${app}-block`).addClass('cp-inactive-app') 
                appBlock.find('.cp-onboardscreen-checkmark').remove();
            } 
        }

        allApps.forEach(app => { 
            let appBlock = h('div.cp-appblock.cp-inactive-app', {id: `${app.toString()}-block`}, app.charAt(0).toUpperCase() + app.slice(1))
            $(grid).append(appBlock);
            $(appBlock).on('click', () => select(app, $(appBlock)));
        }); 

        var save = blocks.activeButton('primary', '', Messages.settings_save, function (done) {
            sendAdminDecree('DISABLE_APPS', appsToDisable, function (e, response) {
                if (e || response.error) {
                    UI.warn(Messages.error);
                    console.error(e, response);
                    done(false);
                    return;
                }
                flushCache();
                done(true);
                UI.log(Messages.saved);

            })
            
            UI.log(Messages.saved);
            displayForm(sendAdminDecree, 1)
        });

        var prev = blocks.activeButton('primary', '', Messages.form_backButton, function () {
            displayForm(sendAdminDecree, 2);
        });

        var screenTitle = h('div.cp-onboardscreen-screentitle');
        $(screenTitle).append(h('div.cp-onboardscreen-maintitle', h('h1.cp-onboardscreen-title', Messages.install_onboardingAppsTitle), h('span', Messages.install_onboardingAppsHint)))
        $(save).addClass('cp-onboardscreen-save');
        $(prev).addClass('cp-onboardscreen-prev');
        var nav = blocks.nav([prev, save])
        $(nav).addClass('cp-onboardscreen-nav');
        let form = blocks.form([
            screenTitle,
            grid 
        ], nav);

        $(form).addClass('cp-onboardscreen-form');
        
        return form;
    }    

    OnboardScreen.mfaRegistrationScreen = function(sendAdminDecree, app) {
        const blocks = Sidebar.blocks('admin');

        var restrict = blocks.activeCheckbox({
            key: 'registration',
            getState: function () {
                return false;
            },
            label: 'registration',
            query: function (val, setState) {
                sendAdminDecree('RESTRICT_REGISTRATION', [val], function (e, response) {
                    if (e || response.error) {
                        UI.warn(Messages.error);
                        console.error(e, response);
                        done(false);
                        return;
                    }
                    flushCache();
                    UI.log(Messages.saved);

                });
            },
        });

        var forceMFA = blocks.activeCheckbox({
            key: 'forcemfa',
            getState: function () {
                return false;
            },
            label: 'forcemfa',
            query: function (val, setState) {
                sendAdminDecree('ENFORCE_MFA', [val], function (e, response) {
                    if (e || response.error) {
                        UI.warn(Messages.error);
                        console.error(e, response);
                        done(false);
                        return;
                    }
                    flushCache();
                    UI.log(Messages.saved);

                })
            },
        });

        const grid = blocks.block([], 'cp-admin-customize-options-grid');
        const options = [restrict, forceMFA];

        let mfaOption = h('div.cp-appblock.cp-inactive-app', forceMFA, h('br'), Messages.admin_onboardingMfa);
        $(grid).append(mfaOption);
        let registrationOption = h('div.cp-appblock.cp-inactive-app', restrict, h('br'), Messages.admin_onboardingRegistration);
        $(grid).append(registrationOption);

        var save = blocks.activeButton('primary', '', Messages.settings_save, function () {
            document.location.href = '/drive/';
            return;
        });

        var prev = blocks.activeButton('primary', '', Messages.settings_prev, function () {
            displayForm(sendAdminDecree, 0);
        });

        var screenTitle = h('div.cp-onboardscreen-screentitle');
        $(screenTitle).append(h('div.cp-onboardscreen-maintitle', h('h1.cp-onboardscreen-title', Messages.install_onboardingRegistrationTitle), h('span', Messages.install_onboardingRegistrationHint)));
        $(save).addClass('cp-onboardscreen-save');
        $(prev).addClass('cp-onboardscreen-prev');
        var nav = blocks.nav([prev, save])
        $(nav).addClass('cp-onboardscreen-nav');

        var form = blocks.form([
            screenTitle,
            grid], nav
        );

        $(form).addClass('cp-onboardscreen-form');

        return form;
    
    };

    return OnboardScreen;

});

