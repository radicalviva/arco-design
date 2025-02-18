import React, { useRef, useImperativeHandle, useEffect } from 'react';
import { InputComponentProps, InputProps, RefInputType } from './interface';
import cs from '../_util/classNames';
import omit from '../_util/omit';
import ResizeObserver from '../_util/resizeObserver';
import IconClose from '../../icon/react-icon/IconClose';
import IconHover from '../_class/icon-hover';
import { isFunction, isObject } from '../_util/is';
import useComposition from './useComposition';
import useKeyboardEvent from '../_util/hooks/useKeyboardEvent';
import fillNBSP from '../_util/fillNBSP';

const InputComponent = React.forwardRef<RefInputType, InputComponentProps>(
  (props: InputComponentProps, ref) => {
    const {
      allowClear,
      disabled,
      placeholder,
      className,
      style,
      height,
      prefixCls,
      hasParent,
      size,
      value,
      autoFitWidth,
      onClear,
      readOnly,
      onChange,
      onKeyDown,
      onPressEnter,
      maxLength: propMaxLength,
      clearIcon,
      ...rest
    } = props;

    const otherProps = omit(rest, [
      'error',
      'status',
      'showWordLimit',
      'className',
      'defaultValue',
      'addBefore',
      'addAfter',
      'afterStyle',
      'beforeStyle',
      'prefix',
      'suffix',
      'normalize',
      'normalizeTrigger',
    ]);

    const getKeyboardEvents = useKeyboardEvent();
    const refInput = useRef<HTMLInputElement>();
    const refInputMirror = useRef<HTMLSpanElement>();
    const refPrevInputWidth = useRef<number>(null);

    const maxLength = isObject(propMaxLength)
      ? propMaxLength.errorOnly
        ? undefined
        : propMaxLength.length
      : propMaxLength;

    const normalizeHandler = (type: InputProps['normalizeTrigger'][number]) => {
      let handler = (v) => v;
      const normalizeTrigger = props.normalizeTrigger || ['onBlur'];
      if (
        Array.isArray(normalizeTrigger) &&
        normalizeTrigger.indexOf(type) > -1 &&
        isFunction(props.normalize)
      ) {
        handler = props.normalize;
      }
      return handler;
    };

    const {
      compositionValue,
      valueChangeHandler,
      compositionHandler,
      keyDownHandler,
      triggerValueChangeCallback,
    } = useComposition({
      value,
      maxLength,
      onChange,
      onKeyDown,
      onPressEnter,
      normalizeHandler,
    });

    const inputClassNames = cs(
      prefixCls,
      prefixCls && {
        [`${prefixCls}-size-${size}`]: size,
        [`${prefixCls}-${props.status}`]: props.status,
        [`${prefixCls}-disabled`]: disabled,
      },
      hasParent ? undefined : className
    );
    const inputProps = {
      'aria-invalid': props.status === 'error' || undefined,
      ...otherProps,
      readOnly,
      maxLength,
      disabled,
      placeholder,
      value: compositionValue || value || '',
      className: inputClassNames,
      onKeyDown: keyDownHandler,
      onChange: valueChangeHandler,
      onCompositionStart: compositionHandler,
      onCompositionUpdate: compositionHandler,
      onCompositionEnd: compositionHandler,
      onBlur: (e) => {
        props.onBlur?.(e);
        triggerValueChangeCallback(normalizeHandler('onBlur')(e.target.value), e);
      },
    };

    useImperativeHandle(
      ref,
      () => {
        return {
          dom: refInput.current,
          focus: () => {
            refInput.current && refInput.current.focus && refInput.current.focus();
          },
          blur: () => {
            refInput.current && refInput.current.blur && refInput.current.blur();
          },
        };
      },
      []
    );

    const updateInputWidth = () => {
      if (refInputMirror.current && refInput.current) {
        const needToShowPlaceholder = !inputProps.value && placeholder;
        // use default width of input when placeholder is visible
        if (needToShowPlaceholder) {
          refInput.current.style.width = null;
        } else {
          const width = refInputMirror.current.offsetWidth;
          refInput.current.style.width = `${width + (width ? 8 : 4)}px`;
        }
      }
    };

    // Set the initial width of <input>, and subsequent updates are triggered by ResizeObserver
    useEffect(() => autoFitWidth && updateInputWidth(), []);

    // Here also need placeholder to trigger updateInputWidth after user-input is cleared
    const mirrorValue = inputProps.value || placeholder;

    const handleClear = (e) => {
      if (refInput.current && refInput.current.focus) {
        refInput.current.focus();
      }
      triggerValueChangeCallback('', e);
      onClear && onClear();
    };

    return (
      <>
        {allowClear ? (
          <>
            <input ref={refInput} {...inputProps} />
            {!readOnly && !disabled && allowClear && value ? (
              clearIcon !== undefined ? (
                <span
                  tabIndex={0}
                  className={`${prefixCls}-clear-icon`}
                  {...getKeyboardEvents({ onPressEnter: handleClear })}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear(e);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                >
                  {clearIcon}
                </span>
              ) : (
                <IconHover
                  tabIndex={0}
                  className={`${prefixCls}-clear-icon`}
                  {...getKeyboardEvents({ onPressEnter: handleClear })}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear(e);
                  }}
                >
                  <IconClose
                    // keep focus status
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                  />
                </IconHover>
              )
            ) : null}
          </>
        ) : (
          <input
            ref={refInput}
            {...inputProps}
            style={
              hasParent
                ? {}
                : {
                    ...style,
                    ...('height' in props ? { height } : {}),
                  }
            }
          />
        )}
        {autoFitWidth && (
          <ResizeObserver
            onResize={() => {
              const inputWidth = refInputMirror.current.offsetWidth;
              if (typeof autoFitWidth === 'object') {
                const delay =
                  typeof autoFitWidth.delay === 'function'
                    ? autoFitWidth.delay(inputWidth, refPrevInputWidth.current)
                    : autoFitWidth.delay;
                delay ? setTimeout(updateInputWidth, delay) : updateInputWidth();
              } else {
                updateInputWidth();
              }
              refPrevInputWidth.current = inputWidth;
            }}
          >
            <span className={`${prefixCls}-mirror`} ref={refInputMirror}>
              {fillNBSP(mirrorValue)}
            </span>
          </ResizeObserver>
        )}
      </>
    );
  }
);

InputComponent.displayName = 'InputComponent';

export default InputComponent;
